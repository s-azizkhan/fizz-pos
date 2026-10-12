// Runnable end-to-end check for feature switches + the store/menu data cache.
// Talks HTTP to a running server so the real procedures, cache and busts run.
//   npm run dev   # in another shell
//   npm run check:features
// Restores the store's feature switches and the toggled item when done. Creates
// (and voids) one open tab to prove KOT-off orders skip the kitchen lanes.
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function call(path: string, body: unknown, cookie = "") {
  const res = await fetch(`${BASE}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ json: body }),
  });
  const payload = await res.json();
  return { ok: res.ok, res, data: payload.result?.data?.json, error: payload.error };
}

async function query(path: string, input: unknown, cookie = "") {
  const qs = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const payload = await (
    await fetch(`${BASE}/api/trpc/${path}${qs}`, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } })
  ).json();
  return { data: payload.result?.data?.json, code: payload.error?.json?.data?.code as string | undefined };
}

const login = await call("auth.login", {
  email: process.env.ADMIN_EMAIL || "admin@fizz.local",
  password: process.env.ADMIN_PASSWORD || "fizz1234",
});
assert.ok(login.ok, `admin login failed: ${login.error?.json?.message}`);
const admin = (login.res.headers.get("set-cookie") ?? "").split(";")[0];

type Store = Record<string, unknown> & { disabledFeatures: string[]; menuSlug: string | null; menuPublished: boolean };
const getStore = async () => (await query("store.get", undefined, admin)).data as Store;
const original = await getStore();

// store.update takes the whole settings form; nullable text goes back as "".
const FORM = [
  "name", "legalName", "email", "phone", "instagram", "logoUrl", "website", "addressLine1",
  "addressLine2", "city", "state", "postalCode", "country", "taxId", "taxRate", "taxLabel",
  "taxInclusive", "timezone", "upiId", "upiName", "currency", "openingTime", "closingTime",
  "invoicePrefix", "orderPrefix", "invoiceNumberFormat", "orderNumberFormat",
];
async function setOff(off: string[]) {
  const s = await getStore();
  const form = Object.fromEntries(FORM.map((k) => [k, s[k] ?? ""]));
  // Read the live counters, never the cached copy, so the save can't rewind them.
  const r = await call(
    "store.update",
    { ...form, nextInvoiceSeq: s.nextInvoiceSeq, nextOrderSeq: s.nextOrderSeq, disabledFeatures: JSON.stringify(off) },
    admin,
  );
  assert.ok(r.ok, `store.update failed: ${r.error?.json?.message}`);
}

try {
  // --- store cache busts on write: the very next read sees the switch --------
  await getStore(); // warm the cache
  await setOff(["expenses", "kot", "inventory"]);
  assert.deepEqual((await getStore()).disabledFeatures, ["expenses", "kot", "inventory"], "read-your-writes");

  // --- switched-off features refuse at the API, not just in the UI -----------
  assert.equal((await query("expenses.list", "2026-01", admin)).code, "FORBIDDEN", "expenses gated");
  assert.equal((await query("orders.kotCounts", undefined, admin)).code, "FORBIDDEN", "kot gated");
  assert.equal((await query("recipe.ingredients", undefined, admin)).code, "FORBIDDEN", "recipes follow inventory");
  assert.equal((await query("analytics.margins", undefined, admin)).code, "FORBIDDEN", "margins needs inventory");
  assert.ok((await query("analytics.homeSnapshot", undefined, admin)).data, "home stays up");

  // --- KOT off: a new tab never enters a kitchen lane ------------------------
  const tab = await call(
    "orders.save",
    { type: "dine_in", items: [{ name: "Feature Check Tab", unitPrice: 50, quantity: 1 }] },
    admin,
  );
  assert.ok(tab.ok, `tab saved: ${tab.error?.json?.message}`);
  await setOff([]);
  const queued = (await query("orders.kot", "new", admin)).data as { id: string }[];
  assert.ok(!queued.some((o) => o.id === tab.data.orderId), "KOT-off tab not queued after re-enable");
  assert.ok((await call("orders.void", tab.data.orderId, admin)).ok, "test tab voided");
  assert.ok((await query("expenses.list", "2026-01", admin)).data, "expenses back on");

  // --- menu cache busts on write ---------------------------------------------
  type Cat = { items: { id: string; available: boolean }[] };
  const full = async () => (await query("menu.full", undefined, admin)).data as Cat[];
  const item = (await full()).flatMap((c) => c.items)[0];
  if (item) {
    assert.ok((await call("menu.toggleAvailable", { id: item.id }, admin)).ok);
    const now = (await full()).flatMap((c) => c.items).find((i) => i.id === item.id);
    assert.equal(now?.available, !item.available, "menu read-your-writes");
    assert.ok((await call("menu.toggleAvailable", { id: item.id }, admin)).ok, "item restored");
  } else console.log("skip: no menu items to toggle");

  // --- public menu switch -----------------------------------------------------
  if (original.menuSlug && original.menuPublished) {
    assert.ok((await query("menu.public", original.menuSlug)).data, "public menu served");
    await setOff(["publicMenu"]);
    assert.equal((await query("menu.public", original.menuSlug)).data, null, "public menu off = null");
  } else console.log("skip: no published menu slug");
} finally {
  await setOff(original.disabledFeatures);
}

console.log("Features + cache OK");
