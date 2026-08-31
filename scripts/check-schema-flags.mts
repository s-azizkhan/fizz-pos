// Regression check for the z.coerce.boolean() bug: the string "false" that a
// <select>/hidden input sends used to parse as TRUE, flipping the store to
// tax-inclusive (understating every order total) and making a menu item
// impossible to save as unavailable.
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { storeSettingsForm } from "../lib/db/schema/store";
import { itemForm } from "../lib/db/schema/menu";

const base = {
  name: "X", taxRate: "5", taxLabel: "GST", timezone: "UTC", currency: "USD",
  openingTime: "08:00", closingTime: "20:00", invoicePrefix: "INV", orderPrefix: "ORD",
  invoiceNumberFormat: "{prefix}-{seq}", orderNumberFormat: "{prefix}-{seq}",
  nextInvoiceSeq: "1", nextOrderSeq: "1",
};

// A form sends strings.
assert.equal(storeSettingsForm.parse({ ...base, taxInclusive: "false" }).taxInclusive, false);
assert.equal(storeSettingsForm.parse({ ...base, taxInclusive: "true" }).taxInclusive, true);
// tRPC sends real booleans.
assert.equal(storeSettingsForm.parse({ ...base, taxInclusive: false }).taxInclusive, false);
assert.equal(storeSettingsForm.parse({ ...base, taxInclusive: true }).taxInclusive, true);
// Absent falls back to the default.
assert.equal(storeSettingsForm.parse(base).taxInclusive, false);

const item = { categoryId: randomUUID(), name: "Latte", price: "3.50", cost: "1.00" };
assert.equal(itemForm.parse({ ...item, available: "false" }).available, false);
assert.equal(itemForm.parse({ ...item, available: false }).available, false);
assert.equal(itemForm.parse(item).available, true);

console.log("boolean-coercion asserts pass");
