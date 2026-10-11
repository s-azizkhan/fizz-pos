// Self-check for the WebUSB printer transport against a fake navigator.usb
// that behaves like Chrome's (open/claim/transferOut rules, unplug, replug).
// No printer needed. Run: npx tsx scripts/check-usb-print.mts
import assert from "node:assert/strict";

type Ep = { direction: "in" | "out"; type: string; endpointNumber: number };
type Iface = { interfaceNumber: number; alternate: { interfaceClass: number; endpoints: Ep[] } };

const log: string[] = [];

class FakeDevice {
  opened = false;
  configuration: { interfaces: Iface[] } | null = null;
  claimed = new Set<number>();
  gone = false;
  received: number[] = [];
  calls = 0;
  forgotten = false;
  constructor(
    public vendorId: number,
    public productId: number,
    public serialNumber: string | undefined,
    public productName: string | undefined,
    public interfaces: Iface[],
    public opts: { driverHeld?: boolean; failNext?: number; status?: string } = {},
  ) {}
  async open() {
    if (this.gone) throw new DOMException("The device was disconnected.", "NotFoundError");
    this.opened = true;
    log.push("open");
  }
  async selectConfiguration(n: number) {
    if (!this.opened) throw new DOMException("The device must be opened first.", "InvalidStateError");
    assert.equal(n, 1);
    this.configuration = { interfaces: this.interfaces };
  }
  async claimInterface(n: number) {
    if (!this.configuration) throw new DOMException("No configuration selected.", "InvalidStateError");
    if (this.opts.driverHeld) throw new DOMException("Unable to claim interface.", "NetworkError");
    this.claimed.add(n);
    log.push(`claim ${n}`);
  }
  async transferOut(ep: number, data: BufferSource) {
    this.calls++;
    if (this.gone || !this.opened) throw new DOMException("The device was disconnected.", "NotFoundError");
    const iface = this.interfaces.find((i) =>
      i.alternate.endpoints.some((e) => e.endpointNumber === ep && e.direction === "out"),
    );
    if (!iface || !this.claimed.has(iface.interfaceNumber))
      throw new DOMException("The specified endpoint is not part of a claimed interface.", "NotFoundError");
    if (this.opts.failNext) {
      this.opts.failNext--;
      throw new DOMException("A transfer error has occurred.", "NetworkError");
    }
    if (this.opts.status) return { status: this.opts.status };
    const bytes = new Uint8Array(data as ArrayBuffer);
    this.received.push(...bytes);
    log.push(`out ${ep} ${bytes.length}`);
    // Async gap so interleaving would show if the queue were broken.
    await new Promise((r) => setTimeout(r, 2));
    return { status: "ok", bytesWritten: bytes.length };
  }
  async forget() {
    this.forgotten = true;
    granted = granted.filter((d) => d !== this);
  }
}

const bulkOut = (n: number): Ep => ({ direction: "out", type: "bulk", endpointNumber: n });
const bulkIn = (n: number): Ep => ({ direction: "in", type: "bulk", endpointNumber: n });

let granted: FakeDevice[] = [];
let nextPick: FakeDevice | null = null;
const usb = Object.assign(new EventTarget(), {
  async requestDevice(o: { filters: object[] }) {
    assert.ok(Array.isArray(o.filters), "Chrome requires a filters array");
    if (!nextPick) throw new DOMException("No device selected.", "NotFoundError");
    const d = nextPick;
    nextPick = null;
    if (!granted.includes(d)) granted.push(d);
    return d;
  },
  async getDevices() {
    return granted.filter((d) => !d.gone);
  },
});
const unplug = (d: FakeDevice) => {
  d.gone = true;
  d.opened = false;
  usb.dispatchEvent(Object.assign(new Event("disconnect"), { device: d }));
};

// No navigator.usb → unsupported, before the fake is installed.
const usbMod = await import("../lib/print/usb");
assert.equal(usbMod.usbSupported(), "navigator" in globalThis && "usb" in navigator);
Object.defineProperty(globalThis, "navigator", { value: { usb }, configurable: true });
assert.equal(usbMod.usbSupported(), true);

const t = await import("../lib/print/transport");
const { NeedsPairingError } = await import("../lib/print/bluetooth");
const { testTicket } = await import("../lib/print/templates");
const ticket = testTicket();

// 1. Pair a printer-class device: picks the class-7 interface's bulk OUT,
//    ignoring a vendor interface listed first.
const p1 = new FakeDevice(0x0416, 0x5011, "SN1", "POS-58", [
  { interfaceNumber: 0, alternate: { interfaceClass: 0xff, endpoints: [bulkOut(1)] } },
  { interfaceNumber: 1, alternate: { interfaceClass: 7, endpoints: [bulkIn(2), bulkOut(3)] } },
]);
nextPick = p1;
const info = await t.pairUsb();
assert.deepEqual(info, { id: "usb:416:5011:SN1", name: "POS-58" });
assert.ok(t.isConnected(info.id));
assert.deepEqual([...p1.claimed], [1]);

// 2. Print routes to USB and the exact ESC/POS bytes land on endpoint 3.
await t.print(info.id, ticket);
assert.deepEqual(p1.received, [...ticket]);
assert.ok(log.includes(`out 3 ${ticket.length}`));

// 3. Two jobs fired together never interleave.
p1.received = [];
const a = new Uint8Array([1, 1, 1]);
const b = new Uint8Array([2, 2, 2]);
await Promise.all([t.print(info.id, a), t.print(info.id, b)]);
assert.deepEqual(p1.received, [1, 1, 1, 2, 2, 2]);

// 3b. A retry must not let a later job jump ahead of the one being resent.
p1.received = [];
p1.opts.failNext = 1;
await Promise.all([t.print(info.id, a), t.print(info.id, b)]);
assert.deepEqual(p1.received, [1, 1, 1, 2, 2, 2]);

// 4. A transient transfer error reconnects once and resends the whole job.
p1.received = [];
p1.opts.failNext = 1;
await t.print(info.id, a);
assert.deepEqual(p1.received, [1, 1, 1]);

// 5. Two failures in a row surface the error instead of looping.
p1.opts.failNext = 2;
await assert.rejects(t.print(info.id, a), /transfer error/);
p1.opts.failNext = 0;

// 6. A non-ok status (e.g. "stall") surfaces without a retry.
p1.opts.status = "stall";
p1.calls = 0;
await assert.rejects(t.print(info.id, a), /replied "stall"/);
assert.equal(p1.calls, 1, "a printer that answered isn't resent to");
delete p1.opts.status;

// 7. Unplug → not connected, print fails with NeedsPairingError (not found).
unplug(p1);
assert.equal(t.isConnected(info.id), false);
await assert.rejects(t.print(info.id, a), NeedsPairingError);

// 8. Replug: Chrome hands back a new object with the same ids; print finds,
//    opens and claims it without a picker.
const p1b = new FakeDevice(0x0416, 0x5011, "SN1", "POS-58", p1.interfaces);
granted.push(p1b);
await t.print(info.id, a);
assert.deepEqual(p1b.received, [1, 1, 1]);
assert.ok(t.isConnected(info.id));

// 9. Fresh page load: module state empty, printer already granted.
//    (Simulated by a second printer the module has never selected.)
const p2 = new FakeDevice(0x28e9, 0x0289, undefined, undefined, [
  { interfaceNumber: 0, alternate: { interfaceClass: 0xff, endpoints: [bulkIn(1), bulkOut(2)] } },
]);
granted.push(p2);
const remembered = await t.rememberedPrinters();
assert.ok(remembered.some((r) => r.id === "usb:28e9:289:" && r.name === "USB printer"));
await t.print("usb:28e9:289:", b);
assert.deepEqual(p2.received, [2, 2, 2], "vendor-class 0xFF fallback works");
assert.equal(t.isConnected(info.id), false, "only the active printer reads connected");

// 10. Driver holds the interface (Windows/Linux) → friendly message.
const held = new FakeDevice(0x04b8, 0x0202, "E1", "TM-T20", p1.interfaces, { driverHeld: true });
nextPick = held;
await assert.rejects(t.pairUsb(), /WinUSB/);

// 11. Device with no bulk OUT (e.g. a USB keyboard picked by mistake).
nextPick = new FakeDevice(1, 2, "K", "Keyboard", [
  { interfaceNumber: 0, alternate: { interfaceClass: 3, endpoints: [{ direction: "in", type: "interrupt", endpointNumber: 1 }] } },
]);
await assert.rejects(t.pairUsb(), /no print channel/);

// 12. Cancelled picker propagates NotFoundError (UI treats it as "no").
nextPick = null;
await assert.rejects(t.pairUsb(), (e: unknown) => e instanceof DOMException && e.name === "NotFoundError");

// 13. Forget revokes permission and drops it from the remembered list.
await t.forget("usb:28e9:289:");
assert.ok(p2.forgotten);
assert.ok(!(await t.rememberedPrinters()).some((r) => r.id === "usb:28e9:289:"));
await assert.rejects(t.print("usb:28e9:289:", a), NeedsPairingError);

// 14. printToDefault (the till's path) prints to a USB default, and when the
//     printer is missing on a tap, reopens the USB picker — not Bluetooth.
const { usePrinter } = await import("../lib/store/printer");
const { printToDefault } = await import("../lib/print/print-order");
usePrinter.getState().setPrinter(info);
p1b.received = [];
assert.equal(await printToDefault(() => a), true);
assert.deepEqual(p1b.received, [1, 1, 1]);

unplug(p1b);
const p1c = new FakeDevice(0x0416, 0x5011, "SN1", "POS-58", p1.interfaces);
nextPick = p1c; // the USB picker hands it back; bluetooth isn't even present
assert.equal(await printToDefault(() => b, { interactive: true }), true);
assert.deepEqual(p1c.received, [2, 2, 2]);
assert.equal(usePrinter.getState().deviceId, info.id);

// Non-interactive (auto-print) with the printer gone rejects, never hangs.
unplug(p1c);
await assert.rejects(printToDefault(() => a), NeedsPairingError);

console.log("usb print: all checks passed");
