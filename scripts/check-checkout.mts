// Money-path regression checks. The till is the one place a silent change
// costs real money, and there is no test runner in this repo — so this is a
// plain assert script: `npx tsx scripts/check-checkout.mts`.
//
// It covers what can be checked without a live DB: the server-side recompute
// and the input schema. Order-number monotonicity needs a real DB and a
// session cookie, so it is a manual step (settle two orders, confirm the
// numbers differ) — see the note at the bottom.
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { checkoutSchema } from "../lib/db/schema/order";
import { computeTotals } from "../lib/store/totals";

const items = [{ name: "Latte", unitPrice: 100, quantity: 2 }] as never;
const noFees = { service: 0, packaging: 0, delivery: 0 };

// 1. Totals are derived from unitPrice x quantity, tax added on top.
const onTop = computeTotals(items, 0, { rate: 10, inclusive: false }, noFees, "dine_in");
assert.equal(onTop.subtotal, 200, "subtotal");
assert.equal(onTop.taxAmount, 20, "tax added on top");
assert.equal(onTop.total, 220, "total with tax on top");

// 2. Tax-inclusive backs the tax out instead; the total must NOT change.
//    (This is the mode the z.coerce.boolean() bug used to force the store into,
//    which understated every total by the tax amount.)
const inclusive = computeTotals(items, 0, { rate: 10, inclusive: true }, noFees, "dine_in");
assert.equal(inclusive.total, 200, "inclusive total unchanged");
assert.ok(inclusive.taxAmount > 0, "inclusive tax extracted");
assert.ok(inclusive.total < onTop.total, "the two tax modes must differ");

// 3. A client-supplied `total` is ignored: the schema strips it, so it can
//    never reach computeTotals or the DB.
const parsed = checkoutSchema.parse({
  type: "dine_in",
  paymentMethod: "cash",
  discount: 0,
  total: 1, // hostile
  items: [{ menuItemId: randomUUID(), name: "Latte", unitPrice: 100, quantity: 2 }],
});
assert.ok(!("total" in parsed), "client total must be stripped by the schema");

// 4. Discount is capped at the subtotal — never a negative total.
const overDiscount = computeTotals(items, 9999, { rate: 10, inclusive: false }, noFees, "dine_in");
assert.equal(overDiscount.safeDiscount, 200, "discount capped at subtotal");
assert.equal(overDiscount.total, 0, "no negative total");

// 5. Fees ride on top of tax and are never taxed. Delivery only on delivery.
const fees = { service: 5, packaging: 2, delivery: 7 };
const dineIn = computeTotals(items, 0, { rate: 10, inclusive: false }, fees, "dine_in");
assert.equal(dineIn.delivery, 0, "delivery fee ignored off a delivery order");
assert.equal(dineIn.total, 227, "220 + 5 + 2");
const delivery = computeTotals(items, 0, { rate: 10, inclusive: false }, fees, "delivery");
assert.equal(delivery.total, 234, "220 + 5 + 2 + 7");
assert.equal(delivery.taxAmount, 20, "fees are not taxed");

console.log("checkout money asserts pass");
console.log(
  "MANUAL (needs DB): settle two orders back to back and confirm the order " +
    "numbers differ — nextOrderNumber() runs outside the transaction, and " +
    "mutations must stay at retry: 0 (lib/trpc/Provider.tsx).",
);
