// Web Bluetooth (BLE) transport for ESC/POS thermal printers.
// Works in Chrome/Edge on desktop and Android over HTTPS. iOS browsers are
// all WebKit and have no Web Bluetooth (Bluefy is the exception).
// Classic-SPP-only printers never show up in the picker: they need BLE.

// ponytail: hand-rolled subset of the Web Bluetooth types (not in TS's DOM lib);
// swap for @types/web-bluetooth if we need more of the API.
type BTChar = {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse(b: BufferSource): Promise<void>;
  writeValueWithoutResponse(b: BufferSource): Promise<void>;
};
type BTServer = {
  connected: boolean;
  connect(): Promise<BTServer>;
  getPrimaryServices(): Promise<{ getCharacteristics(): Promise<BTChar[]> }[]>;
};
type BTDevice = EventTarget & {
  id: string;
  name?: string;
  gatt?: BTServer;
  forget?(): Promise<void>;
};
type BT = {
  requestDevice(o: {
    acceptAllDevices: boolean;
    optionalServices: (string | number)[];
  }): Promise<BTDevice>;
  getDevices?(): Promise<BTDevice[]>;
};

// Print services cheap thermal printers expose. getPrimaryServices() only
// returns services listed here, so an unknown printer needs its UUID added.
const SERVICES: (string | number)[] = [
  0x18f0,
  0xffe0,
  0xff00,
  0xae30,
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

// Bytes per GATT write. Most printers negotiate an MTU above 100; ones stuck
// at the BLE default (23) only take 20, so we drop to that on the first failure.
// ponytail: calibration knobs. Raise CHUNK / drop DELAY_MS if prints are slow,
// do the reverse if long receipts come out truncated.
const CHUNK = 100;
const SAFE_CHUNK = 20;
const DELAY_MS = 10;

export type PrinterInfo = { id: string; name: string };

export class NeedsPairingError extends Error {
  constructor() {
    super("Reconnect the printer to keep printing.");
  }
}

let device: BTDevice | null = null;
let char: BTChar | null = null;
let chunk = CHUNK;
let queue: Promise<unknown> = Promise.resolve();

const bt = () => (navigator as unknown as { bluetooth: BT }).bluetooth;

export function bluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

// Whether the browser can reconnect to a remembered printer without the
// picker. Without it, each new session needs one tap on "Connect".
export function canRememberPrinters(): boolean {
  return bluetoothSupported() && typeof bt().getDevices === "function";
}

function select(d: BTDevice) {
  if (device === d) return;
  device = d;
  char = null;
  chunk = CHUNK;
  d.addEventListener("gattserverdisconnected", () => {
    if (device === d) char = null;
  });
}

// Opens the browser's device picker. Must be called from a user gesture.
export async function pair(): Promise<PrinterInfo> {
  const d = await bt().requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICES,
  });
  select(d);
  await connect();
  return { id: d.id, name: d.name || "Bluetooth printer" };
}

// Printers this site already has permission for (needs getDevices support).
export async function rememberedPrinters(): Promise<PrinterInfo[]> {
  if (!canRememberPrinters()) return [];
  const list = await bt().getDevices!();
  return list.map((d) => ({ id: d.id, name: d.name || "Bluetooth printer" }));
}

async function find(id: string): Promise<BTDevice> {
  if (device?.id === id) return device;
  const d = canRememberPrinters()
    ? (await bt().getDevices!()).find((x) => x.id === id)
    : undefined;
  if (!d) throw new NeedsPairingError();
  select(d);
  return d;
}

async function connect(): Promise<BTChar> {
  if (char && device?.gatt?.connected) return char;
  const server = await device!.gatt!.connect().catch((e: unknown) => {
    // Chrome's "Unsupported device." = no BLE GATT link: a classic-only
    // printer, or one already paired in the OS Bluetooth settings.
    throw e instanceof Error && /unsupported/i.test(e.message)
      ? new Error(
          "Printer refused a Bluetooth LE link. Unpair it in your phone/computer Bluetooth settings and try again. Classic-only printers can't print from a browser.",
        )
      : e;
  });
  for (const svc of await server.getPrimaryServices()) {
    for (const c of await svc.getCharacteristics()) {
      if (c.properties.writeWithoutResponse || c.properties.write) {
        char = c;
        return c;
      }
    }
  }
  throw new Error("This printer has no writable channel Fizz recognises.");
}

export function isConnected(id: string): boolean {
  return device?.id === id && !!char && !!device.gatt?.connected;
}

async function write(c: BTChar, data: Uint8Array<ArrayBuffer>) {
  const send = (b: Uint8Array<ArrayBuffer>) =>
    c.properties.writeWithoutResponse
      ? c.writeValueWithoutResponse(b)
      : c.writeValueWithResponse(b);
  for (let i = 0; i < data.length; ) {
    const part = data.slice(i, i + chunk);
    try {
      await send(part);
    } catch (e) {
      // A dropped link isn't an MTU problem — let print() reconnect instead.
      if (chunk === SAFE_CHUNK || !device?.gatt?.connected) throw e;
      chunk = SAFE_CHUNK; // retry this slice smaller
      continue;
    }
    i += part.length;
    if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

// Queue a job so two prints never interleave on the wire.
export function print(id: string, data: Uint8Array<ArrayBuffer>): Promise<void> {
  const job = queue.then(async () => {
    await find(id);
    try {
      await write(await connect(), data);
    } catch (e) {
      // Printers sleep between rushes; the stale link fails on first write.
      // Reconnect once and resend. ponytail: a drop mid-ticket reprints the
      // whole ticket — duplicate paper beats a missing order.
      if (device?.gatt?.connected) throw e;
      char = null;
      await write(await connect(), data);
    }
  });
  queue = job.catch(() => {});
  return job;
}

// Revoke the site's permission for this printer (where supported).
export async function forget(id: string): Promise<void> {
  const d = await find(id).catch(() => null);
  if (device?.id === id) {
    device = null;
    char = null;
  }
  await d?.forget?.();
}
