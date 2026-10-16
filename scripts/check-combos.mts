// Combo flow over HTTP against a running dev server: build a combo, sell it at
// the POS and from the public menu, and check stock, pricing, tenancy and the
// "part went off the menu" path. Cleans up both stores at the end.
//   npm run dev   # in another shell
//   npx tsx --env-file=.env scripts/check-combos.mts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

async function openCounter(tag: string) {
  const signed = await call("auth.signup", {
    storeName: `Combo ${tag}`, name: `Owner ${tag}`, contact: `e2e.combo${tag}.${run}@example.com`, password: "brew1234",
  });
  assert.ok(signed.ok, `signup ${tag}: ${signed.error?.message}`);
  const cookie = sessionFrom(signed.res);
  const storeId = (await query("auth.me", undefined, cookie)).data.storeId as string;
  return { cookie, storeId, slug: `e2e-combo-${tag}-${run}` };
}

const A = await openCounter("a");
const B = await openCounter("b");
try {
  // --- A's menu, published with takeaway ordering on ---------------------------
  const pub = await call("menu.updateAppearance", {
    menuPublished: true, menuSlug: A.slug, menuDomain: "", menuTagline: "", menuTheme: "midnight",
    menuFontScale: "md", menuAccent: "#C6F432", menuWelcome: JSON.stringify({ on: false, layout: "cover", cards: [], socials: [] }),
    ordering: true, whatsapp: "919999999999", dineIn: false, takeaway: true, delivery: false, deliveryFee: "0", packagingFee: "0",
  }, A.cookie);
  assert.ok(pub.ok, `publish: ${pub.error?.message}`);
  assert.ok((await call("menu.createCategory", { name: "Mains", icon: "🍔", available: "true" }, A.cookie)).ok);
  const categoryId = (await query("menu.full", undefined, A.cookie)).data[0].id as string;
  const fries = JSON.stringify([{ name: "Regular", price: "60", cost: "0" }, { name: "Large", price: "90", cost: "0" }]);
  for (const it of [
    { name: "Burger", price: "150", variants: "[]" },
    { name: "Fries", price: "0", variants: fries },
    { name: "Coke", price: "40", variants: "[]" },
  ]) {
    const r = await call("menu.createItem", { categoryId, cost: "0", available: "true", ...it }, A.cookie);
    assert.ok(r.ok, `item ${it.name}: ${r.error?.message}`);
  }
  const menu = (await query("menu.full", undefined, A.cookie)).data[0].items as {
    id: string; name: string; variants: { id: string; name: string }[];
  }[];
  const byName = (n: string) => menu.find((i) => i.name === n)!;
  const large = byName("Fries").variants.find((v) => v.name === "Large")!;
  const parts = [
    { menuItemId: byName("Burger").id, variantId: null, quantity: 1 },
    { menuItemId: byName("Fries").id, variantId: large.id, quantity: 1 },
    { menuItemId: byName("Coke").id, variantId: null, quantity: 1 },
  ];

  // --- builder validation -------------------------------------------------------
  const single = await call("menu.createCombo", { name: "Solo", price: 100, items: [parts[0]] }, A.cookie);
  assert.equal(single.error?.data?.code, "BAD_REQUEST", "one unit is not a combo");
  const twoOfOne = await call("menu.createCombo", { name: "Double", price: 280, items: [{ ...parts[0], quantity: 2 }] }, A.cookie);
  assert.ok(twoOfOne.ok, `2× one item is a combo: ${twoOfOne.error?.message}`);
  const made = await call("menu.createCombo", { name: "Burger Meal", description: "Lunch sorted", price: 229, items: parts }, A.cookie);
  assert.ok(made.ok, `create: ${made.error?.message}`);

  let combos = (await query("menu.combos", undefined, A.cookie)).data as {
    id: string; name: string; worth: number; sellable: boolean; items: { variantName: string | null }[];
  }[];
  assert.equal(combos[0].name, "Burger Meal", "newest combo first");
  const meal = combos[0];
  assert.equal(meal.worth, 280, "worth = 150 + 90 + 40");
  assert.ok(meal.sellable);

  // --- tenancy: B can't use or touch A's combo ----------------------------------
  const theft = await call("menu.createCombo", { name: "Stolen", price: 10, items: parts }, B.cookie);
  assert.equal(theft.error?.data?.code, "BAD_REQUEST", "B can't bundle A's items");
  await call("menu.toggleCombo", { id: meal.id }, B.cookie);
  await call("menu.deleteCombo", { id: meal.id }, B.cookie);
  assert.equal((await query("menu.combos", undefined, B.cookie)).data.length, 0, "B sees no combos");
  combos = (await query("menu.combos", undefined, A.cookie)).data;
  assert.ok(combos.find((c) => c.id === meal.id)?.sellable, "A's combo untouched by B");

  // --- editing Fries re-creates its variants; the combo keeps "Large" -----------
  const edit = await call("menu.updateItem", {
    id: byName("Fries").id, categoryId, name: "Fries", price: "0", cost: "0", available: "true",
    variants: JSON.stringify([{ name: "Regular", price: "60", cost: "0" }, { name: "Large", price: "100", cost: "0" }]),
  }, A.cookie);
  assert.ok(edit.ok, `edit fries: ${edit.error?.message}`);
  combos = (await query("menu.combos", undefined, A.cookie)).data;
  const kept = combos.find((c) => c.id === meal.id)!;
  assert.equal(kept.items.length, 3, "fries survived the variant rewrite");
  assert.equal(kept.items[1].variantName, "Large");
  assert.equal(kept.worth, 290, "worth follows the new Large price");

  // --- POS sale deducts every part's recipe -------------------------------------
  const [bun] = await sql`insert into inventory_items (store_id, name, quantity) values (${A.storeId}, 'Bun', 10) returning id`;
  await sql`insert into recipe_components (menu_item_id, inventory_item_id, quantity) values (${byName("Burger").id}, ${bun.id}, 1)`;
  const sale = await call("orders.checkout", {
    items: [{ comboId: meal.id, name: "Burger Meal", variantName: "Burger + Fries (Large) + Coke", unitPrice: "229", quantity: 2 }],
    paymentMethod: "cash", tendered: "500",
  }, A.cookie);
  assert.ok(sale.ok, `checkout: ${sale.error?.message}`);
  const [stock] = await sql`select quantity from inventory_items where id = ${bun.id}`;
  assert.equal(Number(stock.quantity), 8, "2 combos used 2 buns");

  // --- public menu + web order priced by the server ------------------------------
  const pubMenu = (await query("menu.public", A.slug)).data;
  assert.deepEqual(pubMenu.combos.map((c: { name: string }) => c.name), ["Burger Meal", "Double"]);
  assert.equal((await fetch(`${BASE}/m/${A.slug}`)).status, 200, "public page renders with combos");
  const web = await call("orders.placeWeb", {
    slug: A.slug, clientId: randomUUID(), mode: "Takeaway", name: "Guest", phone: `98${String(run).slice(-8)}`,
    items: [{ comboId: meal.id, quantity: 1 }, { menuItemId: byName("Coke").id, variantId: null, quantity: 1 }],
  });
  assert.ok(web.ok, `placeWeb: ${web.error?.message}`);
  assert.equal(web.data.subtotal, "269.00", "229 combo + 40 coke, server prices");
  const [line] = await sql`
    select oi.combo_id, oi.menu_item_id, oi.variant_name from order_items oi
    join orders o on o.id = oi.order_id
    where o.store_id = ${A.storeId} and o.source = 'web' and oi.combo_id is not null`;
  assert.equal(line.combo_id, meal.id);
  assert.equal(line.menu_item_id, null);
  assert.equal(line.variant_name, "Burger + Fries (Large) + Coke", "kitchen sees what's in it");

  // --- off sale / broken combos disappear ---------------------------------------
  assert.ok((await call("menu.toggleCombo", { id: meal.id }, A.cookie)).ok);
  const off = await call("orders.placeWeb", {
    slug: A.slug, clientId: randomUUID(), mode: "Takeaway", name: "Guest", phone: `97${String(run).slice(-8)}`,
    items: [{ comboId: meal.id, quantity: 1 }],
  });
  assert.equal(off.error?.data?.code, "BAD_REQUEST", "combo switched off can't be ordered");
  await call("menu.toggleCombo", { id: meal.id }, A.cookie);
  assert.ok((await call("menu.deleteItem", { id: byName("Coke").id }, A.cookie)).ok);
  combos = (await query("menu.combos", undefined, A.cookie)).data;
  assert.equal(combos.find((c) => c.id === meal.id)!.sellable, false, "a part off the menu hides the combo");
  assert.deepEqual((await query("menu.public", A.slug)).data.combos.map((c: { name: string }) => c.name), ["Double"]);

  console.log("combos OK");
} finally {
  await sql`delete from store where id in ${sql([A.storeId, B.storeId])}`;
  await sql.end();
}
