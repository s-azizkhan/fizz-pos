// Runnable end-to-end check for the KOT board. Talks HTTP to a running dev
// server, so the real procedures and session handling are exercised.
//   npm run dev   # in another shell
//   npm run check:kot
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
  const url = `${BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const payload = await (
    await fetch(url, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } })
  ).json();
  return { data: payload.result?.data?.json, error: payload.error };
}

const login = await call("auth.login", {
  email: process.env.ADMIN_EMAIL || "admin@fizz.local",
  password: process.env.ADMIN_PASSWORD || "fizz1234",
});
assert.ok(login.ok, `admin login failed: ${login.error?.json?.message}`);
const admin = (login.res.headers.get("set-cookie") ?? "").split(";")[0];

const lane = async (l: string) =>
  (await query("orders.kot", l, admin)).data as { id: string; number: string; status: string }[];
const idsIn = async (l: string) => (await lane(l)).map((o) => o.id);

// --- two paid orders, rung one after the other -------------------------------
// checkout returns the human-facing number, so resolve the row from the board.
const ring = async (name: string) => {
  const res = await call(
    "orders.checkout",
    { type: "takeaway", paymentMethod: "cash", items: [{ name, unitPrice: 100, quantity: 2 }] },
    admin,
  );
  assert.ok(res.ok, `checkout failed: ${res.error?.json?.message}`);
  const number: string = res.data.orderNumber;
  const row = (await lane("new")).find((o) => o.number === number);
  assert.ok(row, `rung order ${number} should be on the board`);
  return row;
};

const first = await ring("KOT Check Latte");
const second = await ring("KOT Check Bun");

// A PAID order still has to be cooked — that's the whole point of the board.
const paid = (await query("orders.byId", first.id, admin)).data;
assert.equal(paid.status, "paid");
assert.equal(paid.kitchenStatus, "new");

// --- oldest first: the newest ticket goes to the BACK of the queue -----------
const queue = await idsIn("new");
assert.ok(queue.includes(first.id) && queue.includes(second.id), "both in the queue");
assert.ok(
  queue.indexOf(first.id) < queue.indexOf(second.id),
  "last order rung sits last in the queue",
);

// --- accept moves lanes ------------------------------------------------------
assert.ok((await call("orders.kotMove", { orderId: first.id, to: "accepted" }, admin)).ok);
assert.ok(!(await idsIn("new")).includes(first.id), "left the queue");
assert.ok((await idsIn("accepted")).includes(first.id), "landed in cooking");

// --- the board only ever moves forward --------------------------------------
assert.equal(
  (await call("orders.kotMove", { orderId: first.id, to: "accepted" }, admin)).error?.json?.data
    ?.code,
  "CONFLICT",
  "re-accepting is refused",
);

assert.ok((await call("orders.kotMove", { orderId: first.id, to: "ready" }, admin)).ok);
assert.ok((await idsIn("ready")).includes(first.id), "ready is the final lane");
assert.equal(
  (await call("orders.kotMove", { orderId: first.id, to: "accepted" }, admin)).error?.json?.data
    ?.code,
  "CONFLICT",
  "ready cannot go backwards",
);

// --- counts drive the tab badges --------------------------------------------
const counts = (await query("orders.kotCounts", undefined, admin)).data;
assert.equal(counts.accepted, (await idsIn("accepted")).length);
assert.ok(counts.new >= 1, "the second order is still queued");

// --- an unpaid open tab is on the board too, and voiding takes it off --------
// Only open orders can be voided, so this doubles as the open-tab case: the
// kitchen cooks a dine-in tab long before anyone settles it.
assert.ok(
  (
    await call(
      "orders.save",
      { type: "dine_in", items: [{ name: "KOT Check Tab", unitPrice: 50, quantity: 1 }] },
      admin,
    )
  ).ok,
  "open tab saved",
);
const openTab = (await lane("new")).find((o) => o.status === "open");
assert.ok(openTab, "an unpaid open tab shows on the board");

assert.ok((await call("orders.void", openTab.id, admin)).ok, "voided");
assert.ok(!(await idsIn("new")).includes(openTab.id), "voided order is off the board");
assert.equal(
  (await call("orders.kotMove", { orderId: openTab.id, to: "accepted" }, admin)).error?.json?.data
    ?.code,
  "CONFLICT",
  "a voided order can't be accepted",
);

console.log("KOT flow OK");
