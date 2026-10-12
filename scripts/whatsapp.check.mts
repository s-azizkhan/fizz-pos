// Smallest check that fails if staff → customer WhatsApp links break: the
// country-code fill-in and the summary text. Run:
//   npx tsx scripts/whatsapp.check.mts
import assert from "node:assert/strict";
import { orderShareText, waNumber } from "../lib/store/whatsapp";

const cafe = "919999999999"; // café's own WhatsApp: +91
assert.equal(waNumber("98765 43210", cafe), "919876543210"); // borrows +91
assert.equal(waNumber("09876543210", cafe), "919876543210"); // drops trunk 0
assert.equal(waNumber("+44 7700 900123", cafe), "447700900123"); // explicit + wins
assert.equal(waNumber("919876543210", cafe), "919876543210"); // already international
assert.equal(waNumber("9876543210", null), "9876543210"); // no café number to borrow from

const text = orderShareText({
  storeName: "Fizz",
  orderNumber: "A-7",
  customerName: "Asha Rao",
  lines: [{ name: "Latte", variantName: "Large", quantity: 2, lineTotal: "240.00" }],
  total: "240.00",
  paid: true,
  currency: "INR",
});
assert.match(text, /^Hi Asha! Your order \*#A-7\* at \*Fizz\*/);
assert.match(text, /2× Latte \(Large\)/);
assert.match(text, /\(paid\)/);

console.log("whatsapp OK");
