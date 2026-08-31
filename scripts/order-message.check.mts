// Smallest check that fails if the public-menu order math breaks:
// delivery fee lands in the total and the sent message. Run:
//   npx tsx scripts/order-message.check.mts
import assert from "node:assert/strict";
import { orderMessage, contrastOn } from "../components/fizz/menu/PublicOrder";

const lines = [
  { key: "a", name: "Flat White", price: 4.5, qty: 2 },
  { key: "b", name: "Croissant", price: 3, qty: 1 },
];

const delivered = orderMessage({
  lines,
  currency: "USD",
  mode: "Delivery",
  name: "Aziz",
  note: "",
  address: "12 Baker Street, near the park",
  deliveryFee: 2.5,
  packagingFee: 0.5,
});
assert.match(delivered, /^\*NEW ORDER: DELIVERY\*/);
assert.match(delivered, /• \*Flat White\* \[x2\] = \*\$9\*/);
assert.match(delivered, /Packaging \(\$0\.50 x 3\): \$1\.50/);
assert.match(delivered, /Delivery: \$2\.50/);
// 12 items + 1.50 packaging + 2.50 delivery
assert.match(delivered, /\*TOTAL BILL: \$16\*/);
assert.match(delivered, /\*SERVICE:\* Delivery/);
assert.match(delivered, /\*Address:\* 12 Baker Street/);
assert.match(delivered, /\*Name:\* Aziz/);

const dineIn = orderMessage({
  lines,
  currency: "USD",
  mode: "Dine-in",
  name: "",
  note: "less sugar",
  address: "",
  deliveryFee: 0,
  packagingFee: 0,
});
assert.match(dineIn, /\*TOTAL BILL: \$12\*/);
assert.doesNotMatch(dineIn, /Delivery:/, "no fee line when there is no fee");
assert.doesNotMatch(dineIn, /Packaging/, "no packaging line when it is free");
assert.doesNotMatch(dineIn, /Address:/);
assert.match(dineIn, /\*Note:\* less sugar/);

// Button labels must stay readable on any theme accent.
assert.equal(contrastOn("#C6F432"), "#0E1116"); // lime -> dark text
assert.equal(contrastOn("#111111"), "#FFFFFF"); // near-black -> light text
assert.equal(contrastOn("bogus"), "#0E1116");

console.log("order message + delivery math OK");
