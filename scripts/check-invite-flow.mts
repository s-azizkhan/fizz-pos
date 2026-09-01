// Runnable end-to-end check for the invite loop. Talks HTTP to a running dev
// server so the real cookie/session path is exercised, not a stubbed caller.
//   npm run dev   # in another shell
//   npx tsx --env-file=.env scripts/check-invite-flow.mts
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = `e2e.invite.${Date.now()}@example.com`;

async function call(path: string, body: unknown, cookie = "") {
  const res = await fetch(`${BASE}/api/trpc/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ json: body }),
  });
  const payload = await res.json();
  return { ok: res.ok, res, data: payload.result?.data?.json, error: payload.error };
}

async function query(path: string, input: unknown, cookie = "") {
  const url = `${BASE}/api/trpc/${path}?input=${encodeURIComponent(
    JSON.stringify({ json: input }),
  )}`;
  const payload = await (await fetch(url, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } })).json();
  return { data: payload.result?.data?.json, error: payload.error };
}

const sessionFrom = (res: Response) =>
  (res.headers.get("set-cookie") ?? "").split(";")[0];

// --- sign in as the admin ----------------------------------------------------
const login = await call("auth.login", {
  // Same fallbacks as scripts/seed-admin.mts, so `npm run db:seed` is enough setup.
  email: process.env.ADMIN_EMAIL || "admin@fizz.local",
  password: process.env.ADMIN_PASSWORD || "fizz1234",
});
assert.ok(login.ok, `admin login failed: ${login.error?.json?.message}`);
const admin = sessionFrom(login.res);
assert.ok(admin.startsWith("fizz_session="), "admin session cookie issued");

// --- an outsider cannot see or touch the team --------------------------------
assert.equal((await query("team.list", undefined)).error?.json?.data?.code, "UNAUTHORIZED");

// --- invite asks for email + role only ---------------------------------------
const invited = await call("team.invite", { email: EMAIL, role: "manager" }, admin);
assert.ok(invited.ok, `invite failed: ${invited.error?.json?.message}`);
const token: string = invited.data.token;
assert.ok(token.length > 20, "shareable token minted");

// the pending invite is listed so the admin can re-copy the link later
const listed = await query("team.list", undefined, admin);
assert.ok(
  listed.data.pending.some((p: { token: string }) => p.token === token),
  "pending invite is re-copyable from the list",
);

// --- the public link shows what's being accepted, and nothing more -----------
const peeked = await query("team.peek", { token });
assert.deepEqual(peeked.data, { email: EMAIL, role: "manager" });

// --- the invitee supplies only name + password -------------------------------
assert.ok(
  (await call("team.accept", { token, name: "E2E", password: "short" })).error,
  "weak password rejected",
);

const accepted = await call("team.accept", {
  token,
  name: "E2E Manager",
  password: "brew1234",
});
assert.ok(accepted.ok, `accept failed: ${accepted.error?.json?.message}`);
const joined = sessionFrom(accepted.res);
assert.ok(joined.startsWith("fizz_session="), "invitee is signed in on accept");

// the role rode the token, never the invitee's form
const me = await query("auth.me", undefined, joined);
assert.equal(me.data.email, EMAIL);
assert.equal(me.data.name, "E2E Manager");
assert.equal(me.data.role, "manager");

// --- the link is single-use, and members can't be double-invited -------------
assert.ok((await query("team.peek", { token })).error, "spent link is dead");
assert.ok(
  (await call("team.invite", { email: EMAIL, role: "staff" }, admin)).error,
  "existing member can't be re-invited",
);

// --- a manager is not an admin ----------------------------------------------
const newUserId = me.data.id;
assert.equal(
  (await call("team.invite", { email: "nope@example.com", role: "staff" }, joined))
    .error?.json?.data?.code,
  "FORBIDDEN",
);

// --- the last admin can't lock themselves out -------------------------------
const adminId = (await query("auth.me", undefined, admin)).data.id;
assert.ok((await call("team.updateRole", { userId: adminId, role: "staff" }, admin)).error);
assert.ok((await call("team.remove", { userId: adminId }, admin)).error);

// --- cleanup doubles as the remove check ------------------------------------
assert.ok((await call("team.remove", { userId: newUserId }, admin)).ok, "member removed");

console.log("invite flow OK");
