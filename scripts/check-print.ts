// Self-check for the ESC/POS builder and receipt layout. No printer needed.
// Run: npx tsx scripts/check-print.ts
import assert from "node:assert/strict";
import { ascii, escpos, INSTA } from "../lib/print/escpos";
import { kot, kotSeq, shortTime, printMoney, receipt, receiptDoc, row, RECEIPT_LAYOUT } from "../lib/print/templates";
import { kotDelta } from "../lib/print/print-order";
import { NeedsPairingError, pair, print } from "../lib/print/bluetooth";

assert.equal(ascii("Résumé ☕"), "Resume ?");
assert.deepEqual([...escpos().line("A").bytes()].slice(-2), [0x41, 0x0a]);
const head = [...escpos().bytes()];
assert.deepEqual(head.slice(0, 7), [0x1b, 0x40, 0x1b, 0x26, 3, 0x7c, 0x7e], "reset + define Insta + ₹");
const HEAD = 2 + 5 + 3 * 37 + 3;
assert.equal(head.length, HEAD);
// Ticket text after the init header (the ₹ bitmap is binary).
const body = (b: Uint8Array) => new TextDecoder().decode(b.slice(HEAD));

assert.equal(printMoney("120", "INR"), "₹120");
assert.equal(printMoney("4.5", "EUR"), "EUR 4.50");
assert.equal(ascii("₹5 ~ok"), "~5 -ok");
assert.equal(ascii(`a|b} ${INSTA}`), "a/b) |}", "real | } never hit the icon slots");
assert.equal(printMoney("4.5", "USD"), "$4.50");

// Fits: padded to the full width. Too long: wraps, value stays on line one.
assert.deepEqual(row("Latte", "$4.00", 16), ["Latte      $4.00"]);
const wrapped = row("Very long oat milk latte", "$4.00", 20);
assert.equal(wrapped[0].length, 20);
assert.ok(wrapped[0].endsWith("$4.00"));
assert.equal(wrapped.slice(1).join(""), "Very long oat milk latte".slice(14));

const base = {
  store: { name: "Fizz Counter", website: "https://www.fizz.in/" },
  currency: "INR",
  orderNumber: "A-7",
  createdAt: "2026-10-11T09:30:00",
  type: "dine_in",
  reference: "T4",
  lines: [{ name: "Latte", quantity: 2, lineTotal: "240" }],
  subtotal: "240.00",
  discount: "0",
  tax: "12.00",
  taxLabel: "GST",
  fees: { service: "0", packaging: "0", delivery: "0" },
  total: "252.00",
};
const text = body(receipt(base, { paper: 58 }));
assert.ok(text.includes("Fizz Counter"));
assert.ok(text.includes("fizz.in\n"), "website, no scheme");
assert.ok(text.includes("We look forward to serving you\nagain\n"), "default footer, word-wrapped on 58mm");
const footer = (store: object) => body(receipt({ ...base, store: { name: "X", ...store } }, { paper: 58 }));
assert.ok(footer({ delivery: true, instagram: "x" }).includes("Home delivery available"));
assert.ok(footer({ instagram: "@fizz" }).includes("Insta |} @fizz\n"));
const both = body(receipt({ ...base, store: { name: "X", delivery: true, instagram: "fizz" } }, { paper: 58, receipt: [{ id: "t", type: "tagline", on: true, both: true }] }));
assert.ok(both.includes("Home delivery available") && both.includes("Insta |} @fizz"), "delivery + insta");
const noDel = body(receipt({ ...base, store: { name: "X", delivery: true, instagram: "fizz" } }, { paper: 58, receipt: [{ id: "t", type: "tagline", on: true, noDelivery: true }] }));
assert.ok(!noDel.includes("delivery") && noDel.includes("Insta |} @fizz"), "delivery hidden, insta takes the line");
assert.ok(text.includes("GST"));
assert.ok(text.includes("Subtotal"), "subtotal when tax moved the total");
assert.ok(!body(receipt({ ...base, tax: "0", total: "240.00" }, { paper: 58 })).includes("Subtotal"), "no subtotal when equal to total");
assert.ok(text.includes("~252"), "₹ on the custom glyph slot");
assert.ok(text.includes("9:30am 11 oct 26"), "short receipt time");
assert.ok(!text.includes("Discount"), "zero lines are skipped");
// Order block options, read off the printed lines.
const orderBlk = (o: object) =>
  receiptDoc(base, { paper: 58, receipt: [{ id: "o", type: "order", on: true, ...o }] }).ops.map((op) => op.text).slice(0, -3); // minus the tear feed
assert.deepEqual(orderBlk({}), ["#A-7", "9:30am 11 oct 26", "DINE IN - T4"], "default order block");
assert.deepEqual(orderBlk({ label: "Bill", h24: true, hide: ["date", "ref"] }), ["Bill A-7", "09:30", "DINE IN"], "label, 24h, hidden parts");
assert.deepEqual(orderBlk({ label: "", inline: true, hide: ["type", "ref"] }), ["A-7".padEnd(15) + " 9:30am 11 oct 26"], "one-line no. + time");
assert.deepEqual(orderBlk({ hide: ["num", "time", "date", "type", "ref"] }), [], "all hidden prints nothing");
const totalOps = (o: object) =>
  receiptDoc(base, { paper: 58, receipt: [{ id: "t", type: "total", on: true, ...o }] }).ops[0];
assert.deepEqual([totalOps({}).text.trim().split(/ +/), totalOps({}).h, totalOps({}).bold], [["TOTAL", "₹252"], 2, true], "default total");
const bigTotal = totalOps({ label: "Grand total", size: "big", bold: false });
assert.deepEqual([bigTotal.text, bigTotal.w, bigTotal.bold], ["Grand total".padEnd(11) + " ₹252", 2, false], "label, big = half columns, not bold");
assert.ok(!/[^\x00-\x7f]/.test(text), "output is pure ASCII");

const ticket = body(
  kot({ storeName: "Fizz", orderNumber: "A-7", type: "takeaway", reference: null, createdAt: new Date(), items: [{ name: "Latte", quantity: 2 }] }, { paper: 80 }),
);
assert.ok(ticket.includes("2 x Latte") && ticket.includes("TAKEAWAY"));
assert.ok(!ticket.includes("~"), "KOT has no prices");
assert.ok(ticket.includes("KOT:TAKEAWAY"));
assert.equal(kotSeq("FZ-20261009-07"), "07");
assert.equal(kotSeq("A7"), "A7");
assert.equal(shortTime("2026-10-09T23:09:00"), "11:09pm 9 oct 26");
assert.equal(shortTime("2026-10-09T00:05:00"), "12:05am 9 oct 26");
const long = body(
  kot({ storeName: "", orderNumber: "A-8", type: "dine_in", reference: "T4", createdAt: new Date(), items: [{ name: "Extra large oat milk vanilla latte", quantity: 12 }] }, { paper: 58 }),
);
assert.ok(long.includes("12 x Extra large oat milk\n     vanilla latte"), "wraps under the name");

// KOT delta: new lines + extra quantity only; reductions never print.
const L = (key: string, quantity: number) => ({ key, name: key, variantName: null, quantity });
assert.deepEqual(
  kotDelta([L("latte", 3), L("mocha", 1), L("tea", 1)], [L("latte", 1), L("tea", 2)]),
  [
    { name: "latte", variantName: null, quantity: 2 },
    { name: "mocha", variantName: null, quantity: 1 },
  ],
);
assert.deepEqual(kotDelta([L("latte", 1)], [L("latte", 1)]), []);

// --- Bluetooth transport against a fake BLE printer -------------------------
// `mtu` = largest write it accepts; `dieOnce` = link drops on the next write
// (a printer that slept between orders).
function fakePrinter(id: string, mtu = 180) {
  const got: number[] = [];
  const sizes: number[] = [];
  let connected = false;
  let dieOnce = false;
  const write = async (b: Uint8Array) => {
    if (!connected) throw new Error("GATT Server is disconnected");
    if (dieOnce) {
      dieOnce = false;
      connected = false;
      throw new Error("GATT operation failed");
    }
    if (b.length > mtu) throw new Error("Value too long");
    sizes.push(b.length);
    got.push(...b);
  };
  const char = {
    properties: { write: false, writeWithoutResponse: true },
    writeValueWithoutResponse: write,
    writeValueWithResponse: write,
  };
  const gatt = {
    get connected() {
      return connected;
    },
    async connect() {
      connected = true;
      return gatt;
    },
    async getPrimaryServices() {
      return [{ getCharacteristics: async () => [char] }];
    },
  };
  const device = Object.assign(new EventTarget(), { id, name: `Mock ${id}`, gatt });
  return { device, got, sizes, sleep: () => (dieOnce = true) };
}

let next: ReturnType<typeof fakePrinter>;
Object.defineProperty(globalThis.navigator, "bluetooth", {
  configurable: true,
  value: { requestDevice: async () => next.device },
});
const bytes = (n: number, seed = 0) => new Uint8Array(Array.from({ length: n }, (_, i) => (i + seed) % 256));

async function checkBluetooth() {
  // Chunked at 100, every byte arrives in order.
  next = fakePrinter("a");
  assert.deepEqual(await pair(), { id: "a", name: "Mock a" });
  const job = bytes(250);
  await print("a", job);
  assert.deepEqual(next.sizes, [100, 100, 50]);
  assert.deepEqual(next.got, [...job]);

  // Printer stuck at the BLE default MTU: drops to 20-byte writes, nothing lost.
  next = fakePrinter("b", 20);
  await pair();
  await print("b", bytes(45));
  assert.deepEqual(next.sizes, [20, 20, 5]);
  assert.deepEqual(next.got, [...bytes(45)]);

  // Printer slept: first write kills the link, print reconnects and resends once.
  next = fakePrinter("c");
  await pair();
  next.sleep();
  await print("c", bytes(30));
  assert.deepEqual(next.got, [...bytes(30)]);
  assert.deepEqual(next.sizes, [30], "chunk size untouched by a dropped link");

  // Two jobs fired together never interleave.
  next.got.length = 0;
  await Promise.all([print("c", bytes(150, 1)), print("c", bytes(150, 2))]);
  assert.deepEqual(next.got, [...bytes(150, 1), ...bytes(150, 2)]);

  // Unknown printer and no getDevices(): ask staff to reconnect.
  await assert.rejects(print("zzz", bytes(1)), NeedsPairingError);
}

checkBluetooth().then(
  () => console.log("print: ok"),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);

// Raster: GS v 0 header, then 1 byte per 8 dots. "#." at scale 4 = 0xF0.
assert.deepEqual(
  [...escpos().image(["#."], 4).bytes()].slice(HEAD),
  [0x1d, 0x76, 0x30, 0, 1, 0, 4, 0, 0xf0, 0xf0, 0xf0, 0xf0],
);

// Receipt keeps default spacing; KOT gets letter spacing (ESC SP 1).
const has = (bytes: Uint8Array, ...seq: number[]) =>
  [...bytes].some((_, i) => seq.every((b, j) => bytes[i + j] === b));
const spaced = receipt(base, { paper: 58 });
assert.ok(!has(spaced, 0x1b, 0x20), "receipt: no letter spacing");
assert.ok(!has(spaced, 0x1b, 0x33), "receipt: default line height");
assert.ok(has(kot({ storeName: "", orderNumber: "1", type: "takeaway", reference: null, createdAt: new Date(), items: [] }, { paper: 58 }), 0x1b, 0x20, 1));
assert.ok(!has(spaced, 0x1b, 0x47), "receipt: no double-strike");

// Layouts: hidden blocks drop out, custom text prints, order follows the list.
{
  const layout = RECEIPT_LAYOUT.map((b) => (b.type === "tagline" ? { ...b, on: false } : b));
  layout.unshift({ id: "x", type: "text", on: true, text: "WIFI fizz123" });
  const t = body(receipt(base, { paper: 58, receipt: layout }));
  assert.ok(t.indexOf("WIFI fizz123") < t.indexOf("#A-7"), "custom text first");
  assert.ok(!t.includes("serving you again"), "hidden tagline gone");
  const ops = receiptDoc(base, { paper: 58 }).ops;
  assert.ok(ops.some((o) => o.text === "Thank you!" && o.align === "center"), "preview ops recorded");
}
console.log("layout checks ok");
