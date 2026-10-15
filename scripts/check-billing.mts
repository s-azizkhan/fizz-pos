// Plans + offline billing over HTTP against a running dev server. Signs up a
// counter, walks trial → lapsed → requested → confirmed, and checks every
// gate the plan controls. Confirmation runs as the seeded admin, whom
// npm run db:seed marks is_platform_admin.
//   npm run dev   # in another shell
//   npx tsx --env-file=.env scripts/check-billing.mts
import assert from "node:assert/strict";
import postgres from "postgres";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const run = Date.now();
const sql = postgres(process.env.DB_URL!, { prepare: false });

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
const appearance = (menuDomain: string) => ({
  menuPublished: false, menuSlug: `e2e-bill-${run}`, menuDomain, menuTagline: "", menuTheme: "midnight", menuFontScale: "md",
  menuAccent: "#C6F432", menuWelcome: JSON.stringify({ on: false, layout: "cover", cards: [], socials: [] }),
  ordering: false, whatsapp: "", dineIn: false, takeaway: false, delivery: false, deliveryFee: "0", packagingFee: "0",
});
const DAY = 86_400_000;

// --- signup: 14-day Pro trial, nothing locked --------------------------------
const signed = await call("auth.signup", { storeName: "Bill Chai", name: "Owner", contact: `e2e.bill.${run}@example.com`, password: "brew1234" });
assert.ok(signed.ok, signed.error?.message);
const owner = sessionFrom(signed.res);
const storeId: string = (await query("auth.me", undefined, owner)).data.storeId;
const [{ trial_ends_at }] = await sql`select trial_ends_at from store where id = ${storeId}`;
assert.ok(new Date(trial_ends_at).getTime() - Date.now() > 13 * DAY, "trial ≈ 14 days");
// Shorten the trial BEFORE the store row is first read (and cached): entitlement
// is computed from the clock on every read, so expiry needs no cache bust.
// JS clock, not now(): the app judges expiry on its own clock, and the DB's can drift.
await sql`update store set trial_ends_at = ${new Date(Date.now() + 2000)} where id = ${storeId}`;
let st = (await query("billing.status", undefined, owner)).data;
assert.equal(st.plan, "pro");
assert.equal(st.trial, true);
assert.deepEqual((await query("store.get", undefined, owner)).data.disabledFeatures, [], "trial locks nothing");

// --- trial over: Free. Pro features forced off, seats = 1, no own domain ------
await new Promise((r) => setTimeout(r, 2500));
st = (await query("billing.status", undefined, owner)).data;
assert.equal(st.plan, "free", "lapsed trial reads as free from the cached row");
const off: string[] = (await query("store.get", undefined, owner)).data.disabledFeatures;
for (const k of ["inventory", "margins", "expenses", "analytics", "report"]) assert.ok(off.includes(k), `${k} locked on free`);
assert.ok(!off.includes("publicMenu"), "QR menu stays free");
assert.equal((await query("inventory.list", undefined, owner)).error?.data?.code, "FORBIDDEN", "locked feature's procedures refuse");
assert.equal((await call("team.invite", { contact: `e2e.bill.staff.${run}@example.com`, role: "staff" }, owner)).error?.data?.code, "FORBIDDEN", "free = owner only");
assert.equal((await call("menu.updateAppearance", appearance("menu.billchai.in"), owner)).error?.data?.code, "FORBIDDEN", "own domain needs Counter");
assert.ok((await call("menu.updateAppearance", appearance(""), owner)).ok, "appearance without a domain still saves");
// a locked key posted from the settings form isn't persisted as the café's own choice
const s0 = (await query("store.get", undefined, owner)).data;
const settings: Record<string, unknown> = { ...s0, taxRate: "0", disabledFeatures: JSON.stringify(["inventory", "kot"]) };
for (const k of Object.keys(settings)) if (settings[k] === null) settings[k] = "";
assert.ok((await call("store.update", settings, owner)).ok, "settings save");
assert.deepEqual((await sql`select disabled_features from store where id = ${storeId}`)[0].disabled_features, ["kot"], "lock stripped, real switch kept");

// --- request a plan: reference to quote, one open request at a time ----------
const r1 = await call("billing.request", { plan: "pro", period: "month" }, owner);
assert.ok(r1.ok, r1.error?.message);
assert.match(r1.data.reference, /^FZ-[A-Z2-9]{6}$/);
assert.equal(r1.data.amount, 49900);
const r2 = await call("billing.request", { plan: "pro", period: "year" }, owner);
assert.ok(r2.ok);
st = (await query("billing.status", undefined, owner)).data;
assert.equal(st.pending.id, r2.data.id, "newest request is the live one");
assert.equal((await sql`select status from payments where id = ${r1.data.id}`)[0].status, "cancelled", "older request cancelled");
assert.equal(st.plan, "free", "requesting alone changes nothing");

// --- an owner can't confirm their own request; a platform admin can ----------
assert.equal((await call("billing.confirm", { id: r2.data.id, note: "" }, owner)).error?.data?.code, "FORBIDDEN");
const login = await call("auth.login", { identifier: process.env.ADMIN_EMAIL || "admin@fizz.local", password: process.env.ADMIN_PASSWORD || "fizz1234" });
assert.ok(login.ok, "seeded admin signs in");
const op = sessionFrom(login.res);
const board = (await query("billing.stores", undefined, op));
assert.ok(!board.error, `platform list: ${board.error?.message} (run npm run db:seed to flag the admin as operator)`);
assert.equal(board.data[0].request?.reference, r2.data.reference, "waiting request sorts first");

const paid = await call("billing.confirm", { id: r2.data.id, note: "UPI 4123" }, op);
assert.ok(paid.ok, paid.error?.message);
st = (await query("billing.status", undefined, owner)).data;
assert.equal(st.plan, "pro");
assert.equal(st.trial, false);
assert.equal(st.pending, null);
const until1 = new Date(st.until).getTime();
assert.ok(until1 - Date.now() > 360 * DAY, "a year of Pro");
assert.equal(st.history[0].reference, r2.data.reference);
assert.deepEqual((await query("store.get", undefined, owner)).data.disabledFeatures, ["kot"], "locks lifted, own switch kept");
assert.ok((await call("team.invite", { contact: `e2e.bill.staff.${run}@example.com`, role: "staff" }, owner)).ok, "Pro seats 5");
assert.equal((await call("billing.confirm", { id: r2.data.id, note: "" }, op)).error?.data?.code, "CONFLICT", "can't confirm twice");

// renewal stacks on the current end date
const r3 = await call("billing.request", { plan: "pro", period: "month" }, owner);
assert.ok((await call("billing.confirm", { id: r3.data.id, note: "" }, op)).ok);
const until2 = new Date((await query("billing.status", undefined, owner)).data.until).getTime();
assert.ok(until2 - until1 > 27 * DAY && until2 - until1 < 32 * DAY, "month added on top of the year");

// drop a request; comp a plan by hand
const r4 = await call("billing.request", { plan: "counter", period: "month" }, owner);
assert.ok((await call("billing.reject", { id: r4.data.id }, op)).ok);
assert.equal((await query("billing.status", undefined, owner)).data.pending, null, "dropped request is gone");
assert.ok((await call("billing.setPlan", { storeId, plan: "counter", until: "2031-01-01" }, op)).ok);
assert.equal((await query("billing.status", undefined, owner)).data.plan, "counter");
assert.ok((await call("menu.updateAppearance", appearance("menu.billchai.in"), owner)).ok, "Counter unlocks the domain");
assert.ok((await call("billing.setPlan", { storeId, plan: "free", until: "" }, op)).ok);
assert.equal((await query("billing.status", undefined, owner)).data.plan, "free");

// --- cleanup --------------------------------------------------------------------
await sql`delete from store where id = ${storeId}`;
await sql.end();
console.log("billing OK");
