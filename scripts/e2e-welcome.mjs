// Welcome-screen end-to-end check against a running server.
//   node --env-file=.env scripts/e2e-welcome.mjs [http://localhost:3000] [slug]
// Logs in as ADMIN_EMAIL/ADMIN_PASSWORD, saves a marker config, checks the
// public page, checks a bad link is rejected, restores the original config.
// distinctive card → public page shows it → restore original → public page back.
const B = process.argv[2] ?? "http://localhost:3000";
const SLUG = process.argv[3] ?? "hb";
const wrap = (json) => JSON.stringify({ 0: { json } });
let cookie = "";
async function call(path, input, method = "POST") {
  const url = `${B}/api/trpc/${path}?batch=1${method === "GET" ? `&input=${encodeURIComponent(wrap(input))}` : ""}`;
  const r = await fetch(url, {
    method,
    headers: { "content-type": "application/json", cookie, origin: B },
    body: method === "POST" ? wrap(input) : undefined,
  });
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const j = await r.json();
  const d = j[0];
  if (d.error) throw new Error(`${path}: ${d.error.json?.message ?? JSON.stringify(d.error)}`);
  return d.result.data.json;
}
const page = async (p) => (await fetch(`${B}${p}`)).text();

await call("auth.login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
console.log("login ok", !!cookie);
const os = await call("menu.orderSettings", undefined, "GET");
const pub = await call("menu.public", SLUG, "GET");
const st = pub.store;
const original = st.menuWelcome;
const base = {
  menuPublished: true, menuSlug: st.menuSlug, menuTagline: st.menuTagline ?? "", menuTheme: st.menuTheme,
  menuFontScale: st.menuFontScale, menuAccent: st.menuAccent,
  ordering: os.ordering, whatsapp: os.whatsapp ?? "", dineIn: os.dineIn, takeaway: os.takeaway, delivery: os.delivery,
  deliveryFee: os.deliveryFee, packagingFee: os.packagingFee,
};
const marker = `E2E Card ${Date.now()}`;
const cfg = {
  on: true, coverUrl: "", heroLottie: "",
  cards: [
    { id: "m1", kind: "menu", title: "View Menu", subtitle: "Order to your table", on: true },
    { id: "g1", kind: "games", title: marker, subtitle: "While you wait", on: true },
    { id: "w1", kind: "wifi", title: "Connect to Wi-Fi", subtitle: "Tap", on: true, ssid: "E2E", password: "pw" },
    { id: "r1", kind: "review", title: "Hidden (no link)", subtitle: "", on: true },
  ],
  socials: ["https://instagram.com/e2e"],
};
await call("menu.updateAppearance", { ...base, menuWelcome: JSON.stringify(cfg) });
let html = await page(`/m/${SLUG}?t=9`);
const checks = {
  "marker card shown": html.includes(marker),
  "games link carries table": html.includes(`/m/${SLUG}/games?t=9`),
  "wifi card shown": html.includes("Connect to Wi-Fi"),
  "review w/o link hidden": !html.includes("Hidden (no link)"),
  "social rendered": html.includes("instagram.com/e2e"),
  "jsonld sameAs has social": html.includes('"sameAs":["https://instagram.com/e2e"'),
  "table badge": html.includes("Table <!-- -->9"),
  "share button": html.includes("Share this place"),
};
// Bad link must be rejected with the card named.
let rejected = "";
try {
  await call("menu.updateAppearance", { ...base, menuWelcome: JSON.stringify({ ...cfg, cards: [{ id: "x", kind: "link", title: "Broken", subtitle: "", on: true, href: "notalink" }] }) });
} catch (e) { rejected = String(e.message); }
checks["bad link rejected, card named"] = rejected.includes('Card "Broken"');
// Restore.
await call("menu.updateAppearance", { ...base, menuWelcome: JSON.stringify(original ?? { on: false, cards: [], socials: [] }) });
html = await page(`/m/${SLUG}`);
checks["restored (marker gone)"] = !html.includes(marker);
for (const [k, v] of Object.entries(checks)) console.log(v ? "PASS" : "FAIL", k);
if (Object.values(checks).some((v) => !v)) process.exit(1);
