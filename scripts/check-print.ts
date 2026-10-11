// Self-check for the ESC/POS builder and receipt layout. No printer needed.
// Run: npx tsx scripts/check-print.ts
import assert from "node:assert/strict";
import { ascii, escpos } from "../lib/print/escpos";
import { kot, kotTime, printMoney, receipt, row } from "../lib/print/templates";
import { kotDelta } from "../lib/print/print-order";
import { NeedsPairingError, pair, print } from "../lib/print/bluetooth";

assert.equal(ascii("Café ☕"), "Cafe ?");
assert.deepEqual([...escpos().line("A").bytes()], [0x1b, 0x40, 0x41, 0x0a]);

assert.equal(printMoney("120", "INR"), "INR 120.00");
assert.equal(printMoney("4.5", "USD"), "$4.50");

// Fits: padded to the full width. Too long: wraps, value stays on line one.
assert.deepEqual(row("Latte", "$4.00", 16), ["Latte      $4.00"]);
const wrapped = row("Very long oat milk latte", "$4.00", 20);
assert.equal(wrapped[0].length, 20);
assert.ok(wrapped[0].endsWith("$4.00"));
assert.equal(wrapped.slice(1).join(""), "Very long oat milk latte".slice(14));

const base = {
  store: { name: "Fizz Café", website: "https://www.fizz.cafe/" },
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
const text = new TextDecoder().decode(receipt(base, 58));
assert.ok(text.includes("Fizz Cafe"));
assert.ok(text.includes("fizz.cafe\n"), "website, no scheme");
assert.ok(text.includes("GST"));
assert.ok(text.includes("INR 252.00"));
assert.ok(!text.includes("Discount"), "zero lines are skipped");
assert.ok(!/[^\x00-\x7f]/.test(text), "output is pure ASCII");

const ticket = new TextDecoder().decode(
  kot({ storeName: "Fizz", orderNumber: "A-7", type: "takeaway", reference: null, createdAt: new Date(), items: [{ name: "Latte", quantity: 2 }] }, 80),
);
assert.ok(ticket.includes("2 x Latte") && ticket.includes("TAKEAWAY"));
assert.ok(!ticket.includes("INR"), "KOT has no prices");
assert.ok(ticket.includes("KOT:TAKEAWAY"));
assert.equal(kotTime("2026-10-09T23:09:00"), "11:09pm 9 oct 26");
assert.equal(kotTime("2026-10-09T00:05:00"), "12:05am 9 oct 26");
const long = new TextDecoder().decode(
  kot({ storeName: "", orderNumber: "A-8", type: "dine_in", reference: "T4", createdAt: new Date(), items: [{ name: "Extra large oat milk vanilla latte", quantity: 12 }] }, 58),
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
  [...escpos().image(["#."], 4).bytes()].slice(2),
  [0x1d, 0x76, 0x30, 0, 1, 0, 4, 0, 0xf0, 0xf0, 0xf0, 0xf0],
);
