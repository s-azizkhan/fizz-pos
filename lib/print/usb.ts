// WebUSB transport for ESC/POS thermal printers plugged in by cable.
// Chrome/Edge on desktop and Android, over HTTPS. No Safari/Firefox.
// The OS must not own the printer: on Windows the vendor driver claims it
// (swap it to WinUSB with Zadig), on Linux the usblp kernel module does.

import { NeedsPairingError, type PrinterInfo } from "./bluetooth";

// ponytail: hand-rolled subset of the WebUSB types (not in TS's DOM lib);
// swap for @types/w3c-web-usb if we need more of the API.
type USBIface = {
  interfaceNumber: number;
  alternate: {
    interfaceClass: number;
    endpoints: { direction: "in" | "out"; type: string; endpointNumber: number }[];
  };
};
type USBDev = {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  productName?: string;
  opened: boolean;
  configuration: { interfaces: USBIface[] } | null;
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(ep: number, data: BufferSource): Promise<{ status: string }>;
  forget?(): Promise<void>;
};
type USB = EventTarget & {
  requestDevice(o: { filters: object[] }): Promise<USBDev>;
  getDevices(): Promise<USBDev[]>;
};

const PRINTER_CLASS = 7;

let device: USBDev | null = null;
let endpoint: number | null = null;
let queue: Promise<unknown> = Promise.resolve();
let listening = false;

const usb = () => (navigator as unknown as { usb: USB }).usb;

export function usbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

// WebUSB has no stable device id; vendor:product:serial is close enough.
// ponytail: two identical printers without serial numbers collide.
const idOf = (d: USBDev) =>
  `usb:${d.vendorId.toString(16)}:${d.productId.toString(16)}:${d.serialNumber ?? ""}`;
const info = (d: USBDev): PrinterInfo => ({ id: idOf(d), name: d.productName || "USB printer" });

export const isUsbId = (id: string) => id.startsWith("usb:");

function select(d: USBDev) {
  if (!listening) {
    listening = true;
    usb().addEventListener("disconnect", (e) => {
      // A replugged printer comes back as a new device object.
      if ((e as Event & { device: USBDev }).device === device) {
        device = null;
        endpoint = null;
      }
    });
  }
  if (device === d) return;
  device = d;
  endpoint = null;
}

const bulkOut = (i: USBIface) =>
  i.alternate.endpoints.find((e) => e.direction === "out" && e.type === "bulk");

async function connect(): Promise<number> {
  const d = device!;
  if (endpoint !== null && d.opened) return endpoint;
  if (!d.opened) await d.open();
  if (!d.configuration) await d.selectConfiguration(1);
  const ifaces = d.configuration!.interfaces;
  // Printer-class interface first; cheap printers often use vendor class 0xFF.
  const iface =
    ifaces.find((i) => i.alternate.interfaceClass === PRINTER_CLASS && bulkOut(i)) ??
    ifaces.find(bulkOut);
  if (!iface) throw new Error("This USB device has no print channel Fizz recognises.");
  await d.claimInterface(iface.interfaceNumber).catch(() => {
    throw new Error(
      "Another driver holds this printer. On Windows, switch its driver to WinUSB (Zadig); on Linux, unload usblp. Then reconnect.",
    );
  });
  endpoint = bulkOut(iface)!.endpointNumber;
  return endpoint;
}

// Opens the browser's device picker. Must be called from a user gesture.
export async function pair(): Promise<PrinterInfo> {
  const d = await usb().requestDevice({ filters: [] });
  select(d);
  await connect();
  return info(d);
}

// WebUSB always remembers granted devices, but only lists ones plugged in.
export async function rememberedPrinters(): Promise<PrinterInfo[]> {
  if (!usbSupported()) return [];
  return (await usb().getDevices()).map(info);
}

async function find(id: string): Promise<USBDev> {
  if (device && idOf(device) === id) return device;
  const d = (await usb().getDevices()).find((x) => idOf(x) === id);
  if (!d) throw new NeedsPairingError();
  select(d);
  return d;
}

export function isConnected(id: string): boolean {
  return !!device && idOf(device) === id && endpoint !== null && device.opened;
}

async function write(data: Uint8Array<ArrayBuffer>) {
  const r = await device!.transferOut(await connect(), data);
  if (r.status !== "ok") throw new Error(`USB printer replied "${r.status}".`);
}

// Queue a job so two prints never interleave on the wire.
export function print(id: string, data: Uint8Array<ArrayBuffer>): Promise<void> {
  const job = queue.then(async () => {
    await find(id);
    try {
      await write(data);
    } catch (e) {
      // Unplug/replug or sleep leaves a dead handle. Reopen once and resend.
      if (e instanceof Error && /driver|replied/.test(e.message)) throw e;
      endpoint = null;
      await write(data);
    }
  });
  queue = job.catch(() => {});
  return job;
}

// Revoke the site's permission for this printer (where supported).
export async function forget(id: string): Promise<void> {
  const d = await find(id).catch(() => null);
  if (d === device) {
    device = null;
    endpoint = null;
  }
  await d?.forget?.();
}
