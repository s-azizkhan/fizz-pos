// Smallest check that fails if the public-menu order message breaks: order
// number, fees, tax and the guest's details all land in what gets sent. Run:
//   npx tsx scripts/order-message.check.mts
import assert from "node:assert/strict";
import { orderMessage } from "../components/fizz/menu/PublicOrder";
import { contrastOn } from "../lib/store/format";

const lines = [
  { name: "Flat White", quantity: 2, amount: 9 },
  { name: "Croissant", quantity: 1, amount: 3 },
];

const delivered = orderMessage({
  orderNumber: "A-0042",
  bill: { lines, packaging: 1.5, delivery: 2.5, tax: { label: "GST", amount: 0.6 }, total: 16.6 },
  currency: "USD",
  mode: "Delivery",
  name: "Aziz",
  phone: "+1 555 0100",
  note: "",
  address: "12 Baker Street, near the park",
});
assert.match(delivered, /^\*NEW ORDER #A-0042: DELIVERY\*/);
assert.match(delivered, /• \*Flat White\* \[x2\] = \*\$9\*/);
assert.match(delivered, /Packaging: \$1\.50/);
assert.match(delivered, /Delivery: \$2\.50/);
assert.match(delivered, /GST: \$0\.60/);
assert.match(delivered, /\*TOTAL BILL: \$16\.60\*/);
assert.match(delivered, /\*SERVICE:\* Delivery/);
assert.match(delivered, /\*Address:\* 12 Baker Street/);
assert.match(delivered, /\*Name:\* Aziz/);
assert.match(delivered, /\*Phone:\* \+1 555 0100/);

// Fallback (order couldn't be saved): no number, no fee/tax lines.
const dineIn = orderMessage({
  orderNumber: null,
  bill: { lines, packaging: 0, delivery: 0, tax: null, total: 12 },
  currency: "USD",
  mode: "Dine-in",
  name: "Sam",
  phone: "5550100",
  note: "less sugar",
  address: "",
});
assert.match(dineIn, /^\*NEW ORDER: DINE-IN\*/);
assert.match(dineIn, /\*TOTAL BILL: \$12\*/);
assert.doesNotMatch(dineIn, /Delivery:/, "no fee line when there is no fee");
assert.doesNotMatch(dineIn, /Packaging/, "no packaging line when it is free");
assert.doesNotMatch(dineIn, /GST/);
assert.doesNotMatch(dineIn, /Address:/);
assert.match(dineIn, /\*Note:\* less sugar/);

// Button labels must stay readable on any theme accent.
assert.equal(contrastOn("#C6F432"), "#0E1116"); // lime -> dark text
assert.equal(contrastOn("#111111"), "#FFFFFF"); // near-black -> light text
assert.equal(contrastOn("bogus"), "#0E1116");

console.log("order message OK");
