// Two-store isolation check over HTTP against a running dev server. Signs up
// two owners, gives each a menu, then asserts neither can read or write the
// other's rows — and that the public menu resolves per slug. Cleans up both
// stores (cascade) straight from the DB at the end.
//   npm run dev   # in another shell
//   npx tsx --env-file=.env scripts/check-tenancy.mts
import assert from "node:assert/strict";
import postgres from "postgres";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const run = Date.now();

async function call(path: string, body: unknown, cookie = "") {
  const res = await fetch(`${BASE}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ json: body }),
  });
  const payload = await res.json();
  return { ok: res.ok, res, data: payload.result?.data?.json, error: payload.error?.json };
}
async function query(path: string, input: unknown, cookie = "") {
  const url = `${BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? null }))}`;
  const payload = await (await fetch(url, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } })).json();
  return { data: payload.result?.data?.json, error: payload.error?.json };
}
const sessionFrom = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0];

// --- two fresh counters --------------------------------------------------------
async function openCounter(tag: string) {
  const email = `e2e.${tag}.${run}@example.com`;
  const signed = await call("auth.signup", { storeName: `Counter ${tag}`, name: `Owner ${tag}`, contact: email, password: "brew1234" });
  assert.ok(signed.ok, `signup ${tag}: ${signed.error?.message}`);
  const cookie = sessionFrom(signed.res);
  const me = (await query("auth.me", undefined, cookie)).data;
  const slug = `e2e-${tag}-${run}`;
  // publish a menu so the guest path has something to resolve
  const appearance = await call("menu.updateAppearance", {
    menuPublished: true, menuSlug: slug, menuDomain: "", menuTagline: "", menuTheme: "midnight",
    menuFontScale: "md", menuAccent: "#C6F432", menuWelcome: JSON.stringify({ on: false, layout: "cover", cards: [], socials: [] }),
    ordering: false, whatsapp: "", dineIn: false, takeaway: false, delivery: false, deliveryFee: "0", packagingFee: "0",
  }, cookie);
  assert.ok(appearance.ok, `publish ${tag}: ${appearance.error?.message}`);
  const cat = await call("menu.createCategory", { name: `Hot ${tag}`, icon: "☕", available: "true" }, cookie);
  assert.ok(cat.ok, `category ${tag}: ${cat.error?.message}`);
  const categoryId = (await query("menu.full", undefined, cookie)).data[0].id as string;
  const item = await call("menu.createItem", { categoryId, name: `Chai ${tag}`, price: "20", cost: "5", available: "true", variants: "[]" }, cookie);
  assert.ok(item.ok, `item ${tag}: ${item.error?.message}`);
  const full = (await query("menu.full", undefined, cookie)).data;
  const itemId = full[0].items[0].id as string;
  return { cookie, storeId: me.storeId as string, slug, categoryId, itemId, email };
}
const A = await openCounter("a");
const B = await openCounter("b");
assert.notEqual(A.storeId, B.storeId, "two distinct stores");
assert.equal((await query("auth.me", undefined, A.cookie)).data.role, "admin");

// --- reads: each sees only its own menu / team ---------------------------------
const menuA = (await query("menu.full", undefined, A.cookie)).data;
assert.deepEqual(menuA.map((c: { name: string }) => c.name), ["Hot a"], "A sees only A's categories");
assert.equal((await query("store.get", undefined, B.cookie)).data.name, "Counter b");
const teamA = (await query("team.list", undefined, A.cookie)).data;
assert.deepEqual(teamA.members.map((m: { contact: string }) => m.contact), [A.email], "A's team is just A");

// --- writes by a guessed id are no-ops across stores ----------------------------
const steal = await call("menu.updateItem", { id: B.itemId, categoryId: A.categoryId, name: "Hijacked", price: "1", cost: "0", available: "true", variants: "[]" }, A.cookie);
assert.ok(steal.error, "A can't edit B's item");
await call("menu.toggleAvailable", { id: B.itemId }, A.cookie);
await call("menu.setDiet", { id: B.itemId, diet: "veg" }, A.cookie);
await call("menu.deleteItem", { id: B.itemId }, A.cookie);
await call("menu.deleteCategory", { id: B.categoryId }, A.cookie);
const menuB = (await query("menu.full", undefined, B.cookie)).data;
assert.equal(menuB[0]?.items[0]?.name, "Chai b", "B's item untouched by A");
assert.equal(menuB[0].items[0].available, true);
assert.equal(menuB[0].items[0].diet, null);

// A's item moved into B's category? Must refuse.
const move = await call("menu.updateItem", { id: A.itemId, categoryId: B.categoryId, name: "Chai a", price: "20", cost: "5", available: "true", variants: "[]" }, A.cookie);
assert.equal(move.error?.data?.code, "BAD_REQUEST", "can't move an item into another store's category");

// --- orders: A's sale never shows up for B --------------------------------------
const sale = await call("orders.checkout", {
  items: [{ menuItemId: A.itemId, name: "Chai a", unitPrice: "20", quantity: 2 }],
  paymentMethod: "cash", tendered: "40",
}, A.cookie);
assert.ok(sale.ok, `checkout: ${sale.error?.message}`);
const month = new Date().toISOString().slice(0, 7);
const mine = (await query("orders.list", { month, offset: 0, limit: 20 }, A.cookie)).data.rows;
assert.equal(mine.length, 1, "A sees its sale");
assert.equal((await query("orders.list", { month, offset: 0, limit: 20 }, B.cookie)).data.rows.length, 0, "B has no orders");
assert.equal((await query("orders.byId", mine[0].id, B.cookie)).data, null, "B can't load A's order");
assert.equal((await call("orders.void", mine[0].id, B.cookie)).error?.data?.code, "NOT_FOUND", "B can't void A's order");

// --- team: invites stay in their store ------------------------------------------
const inv = await call("team.invite", { contact: `e2e.staff.${run}@example.com`, role: "staff" }, A.cookie);
assert.ok(inv.ok, `invite: ${inv.error?.message}`);
assert.equal((await query("team.list", undefined, B.cookie)).data.pending.length, 0, "B doesn't see A's invite");
assert.ok((await call("team.revoke", { id: inv.data.id }, B.cookie)).ok, "revoke call succeeds…");
assert.equal((await query("team.list", undefined, A.cookie)).data.pending.length, 1, "…but touched nothing of A's");
const joined = await call("team.accept", { token: inv.data.token, name: "Staff", password: "brew1234" });
assert.ok(joined.ok, `accept: ${joined.error?.message}`);
assert.equal((await query("auth.me", undefined, sessionFrom(joined.res))).data.storeId, A.storeId, "invitee lands in A's store");

// --- guest path: slug picks the store, logo is per store ------------------------
const pubA = (await query("menu.public", A.slug)).data;
const pubB = (await query("menu.public", B.slug)).data;
assert.equal(pubA.store.name, "Counter a");
assert.equal(pubB.store.name, "Counter b");
assert.equal(pubB.categories[0].items[0].name, "Chai b");
assert.equal((await fetch(`${BASE}/m/${A.slug}/menu`)).status, 200);

// --- dup email is refused, signup is otherwise open -----------------------------
assert.equal((await call("auth.signup", { storeName: "X", name: "X", contact: A.email, password: "brew1234" })).error?.data?.code, "CONFLICT");

// --- cleanup ----------------------------------------------------------------------
const sql = postgres(process.env.DB_URL!, { prepare: false });
await sql`delete from store where id in ${sql([A.storeId, B.storeId])}`;
const [{ n }] = await sql`select count(*)::int n from users where email like ${`e2e.%.${run}@example.com`}`;
await sql.end();
assert.equal(n, 0, "cascade removed both stores' users");
console.log("tenancy OK");
