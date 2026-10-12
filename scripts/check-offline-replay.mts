// Runnable check: an offline sale replayed with the same clientId must land
// exactly once — same receipt number, no second order.
//   npm run dev   # in another shell
//   npm run check:offline
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

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

const login = await call("auth.login", {
  email: process.env.ADMIN_EMAIL || "admin@fizz.local",
  password: process.env.ADMIN_PASSWORD || "fizz1234",
});
assert.ok(login.ok, `admin login failed: ${login.error?.json?.message}`);
const admin = (login.res.headers.get("set-cookie") ?? "").split(";")[0];

const sale = {
  type: "takeaway",
  paymentMethod: "cash",
  items: [{ name: "Offline Check Latte", unitPrice: 100, quantity: 1 }],
  clientId: randomUUID(),
};

// Sequential replay: second delivery answers from the existing row.
const a = await call("orders.checkout", sale, admin);
assert.ok(a.ok, `first delivery failed: ${a.error?.json?.message}`);
const b = await call("orders.checkout", sale, admin);
assert.ok(b.ok, `replay failed: ${b.error?.json?.message}`);
assert.equal(b.data.orderNumber, a.data.orderNumber, "replay must reuse the order");

// Concurrent replay: both race the unique index, both get the same receipt.
const race = { ...sale, clientId: randomUUID() };
const [c, d] = await Promise.all([
  call("orders.checkout", race, admin),
  call("orders.checkout", race, admin),
]);
assert.ok(c.ok && d.ok, `racing deliveries failed: ${c.error?.json?.message ?? d.error?.json?.message}`);
assert.equal(c.data.orderNumber, d.data.orderNumber, "racing replays must collapse to one order");

// Open-tab save replays the same way.
const tab = { type: "dine_in", items: [{ name: "Offline Check Tab", unitPrice: 50, quantity: 1 }], clientId: randomUUID() };
const e = await call("orders.save", tab, admin);
assert.ok(e.ok, `tab save failed: ${e.error?.json?.message}`);
const f = await call("orders.save", tab, admin);
assert.ok(f.ok, `tab replay failed: ${f.error?.json?.message}`);
assert.equal(f.data.orderId, e.data.orderId, "tab replay must reuse the order");
await call("orders.void", e.data.orderId, admin);

console.log(`ok — replays collapsed to ${a.data.orderNumber} and ${c.data.orderNumber}`);
