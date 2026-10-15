// Runnable end-to-end check for owner signup + onboarding. Talks HTTP to a
// running dev server. Needs an EMPTY users table to exercise the signup half;
// on a populated DB it only asserts signup is closed.
//   npm run dev   # in another shell
//   npx tsx --env-file=.env scripts/check-signup-flow.mts
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
async function query(path: string, cookie = "") {
  const url = `${BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: undefined }))}`;
  const payload = await (await fetch(url, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } })).json();
  return { data: payload.result?.data?.json, error: payload.error };
}
const hop = async (path: string, cookie = "") => {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, to: res.headers.get("location") };
};
const sessionFrom = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0];

const open = (await query("auth.canSignup")).data;
const owner = { storeName: "E2E Chai", name: "E2E Owner", email: `e2e.owner.${Date.now()}@example.com`, password: "brew1234" };

if (!open) {
  assert.equal((await call("auth.signup", owner)).error?.json?.data?.code, "CONFLICT", "signup closed once a user exists");
  assert.equal((await hop("/signup")).status, 200, "/signup renders the 'has an owner' screen");
  console.log("signup flow OK (closed — DB already has users)");
  process.exit(0);
}

// --- fresh counter: first account becomes admin and lands on onboarding -----
assert.ok((await call("auth.signup", { ...owner, password: "short" })).error, "weak password rejected");
const signed = await call("auth.signup", owner);
assert.ok(signed.ok, `signup failed: ${signed.error?.json?.message}`);
assert.equal(signed.data.redirectTo, "/onboarding");
const cookie = sessionFrom(signed.res);
assert.ok(cookie.startsWith("fizz_session="), "owner signed in on signup");

const me = (await query("auth.me", cookie)).data;
assert.equal(me.role, "admin");
assert.equal((await query("store.get", cookie)).data.name, "E2E Chai");

// second owner can't happen
assert.equal((await call("auth.signup", { ...owner, email: "second@example.com" })).error?.json?.data?.code, "CONFLICT");
assert.equal((await query("auth.canSignup")).data, false);

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

console.log("signup flow OK");
