// Runnable end-to-end check for owner signup + onboarding. Talks HTTP to a
// running dev server; creates a throwaway store and deletes it at the end.
//   npm run dev   # in another shell
//   npx tsx --env-file=.env scripts/check-signup-flow.mts
import assert from "node:assert/strict";
import postgres from "postgres";

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
async function query(path: string, cookie = "") {
  const url = `${BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: null }))}`;
  const payload = await (await fetch(url, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } })).json();
  return { data: payload.result?.data?.json, error: payload.error };
}
const hop = async (path: string, cookie = "") => {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, to: res.headers.get("location") };
};
const sessionFrom = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0];

const owner = { storeName: "E2E Chai", name: "E2E Owner", contact: `e2e.owner.${Date.now()}@example.com`, password: "brew1234" };

// --- a new counter: first account is its admin and lands on onboarding -------
assert.equal((await hop("/signup")).status, 200, "/signup renders");
assert.ok((await call("auth.signup", { ...owner, password: "short" })).error, "weak password rejected");
const signed = await call("auth.signup", owner);
assert.ok(signed.ok, `signup failed: ${signed.error?.json?.message}`);
assert.equal(signed.data.redirectTo, "/onboarding");
const cookie = sessionFrom(signed.res);
assert.ok(cookie.startsWith("fizz_session="), "owner signed in on signup");

const me = (await query("auth.me", cookie)).data;
assert.equal(me.role, "admin");
const storeId: string = me.storeId;
assert.equal((await query("store.get", cookie)).data.name, "E2E Chai");

// same email can't open a second counter
assert.equal((await call("auth.signup", owner)).error?.json?.data?.code, "CONFLICT");

// dashboard bounces to the wizard until onboarded; /onboarding itself renders
const dash = await hop("/dashboard", cookie);
assert.equal(dash.status, 307);
assert.ok(dash.to?.endsWith("/onboarding"), `fresh admin goes to /onboarding, got ${dash.to}`);
assert.equal((await hop("/onboarding", cookie)).status, 200);
assert.ok((await hop("/onboarding")).to?.endsWith("/login"), "wizard needs a session");

// --- finish the wizard -------------------------------------------------------
const done = await call("store.onboard", {
  name: "E2E Chai", phone: "", country: "India", currency: "INR", timezone: "Asia/Kolkata",
  taxLabel: "GST", taxRate: "5", taxInclusive: "true", openingTime: "07:00", closingTime: "22:00",
  disabledFeatures: JSON.stringify(["inventory"]),
}, cookie);
assert.ok(done.ok, `onboard failed: ${done.error?.json?.message}`);
const store = (await query("store.get", cookie)).data;
assert.ok(store.onboardedAt, "onboardedAt stamped");
assert.equal(store.currency, "INR");
assert.equal(store.taxRate, "5.000");
assert.deepEqual(store.disabledFeatures, ["inventory"]);

assert.equal((await hop("/dashboard", cookie)).status, 200, "dashboard opens after onboarding");
assert.ok((await hop("/onboarding", cookie)).to?.endsWith("/dashboard"), "wizard is one-shot");

// --- phone-only owner: signs up with a bare 10-digit number, logs in with any spelling
const digits = String(7000000000 + (Date.now() % 1000000000));
const byPhone = await call("auth.signup", { storeName: "Phone Chai", name: "P", contact: digits, password: "brew1234" });
assert.ok(byPhone.ok, `phone signup: ${byPhone.error?.json?.message}`);
const pc = sessionFrom(byPhone.res);
const pm = (await query("auth.me", pc)).data;
assert.equal(pm.email, null);
assert.equal(pm.phone, `91${digits}`, "stored canonical with country code");
assert.ok((await call("auth.login", { identifier: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, password: "brew1234" })).ok, "formatted number logs in");
assert.ok((await call("auth.login", { identifier: `0${digits}`, password: "brew1234" })).ok, "0-prefixed logs in");
assert.equal((await call("auth.signup", { storeName: "X", name: "X", contact: `91${digits}`, password: "brew1234" })).error?.json?.data?.code, "CONFLICT", "same number can't sign up twice");
assert.ok((await call("auth.signup", { storeName: "X", name: "X", contact: "12345", password: "brew1234" })).error, "junk contact rejected");
assert.ok((await call("auth.login", { identifier: digits, password: "wrong" })).error, "wrong password");

// --- cleanup -------------------------------------------------------------------
const sql = postgres(process.env.DB_URL!, { prepare: false });
await sql`delete from store where id in ${sql([storeId, pm.storeId])}`;
await sql.end();
console.log("signup flow OK");
