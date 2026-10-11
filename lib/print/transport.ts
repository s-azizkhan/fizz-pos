// Routes printer calls to Bluetooth or USB by device id ("usb:" prefix = USB).
import * as bt from "./bluetooth";
import * as usb from "./usb";

export { NeedsPairingError, type PrinterInfo } from "./bluetooth";
export { bluetoothSupported, canRememberPrinters } from "./bluetooth";
export { usbSupported } from "./usb";

const via = (id: string) => (usb.isUsbId(id) ? usb : bt);

export const pairBluetooth = bt.pair;
export const pairUsb = usb.pair;
// Re-pair on the same transport as an existing printer id.
export const pairLike = (id: string) => via(id).pair();
export const print = (id: string, data: Uint8Array<ArrayBuffer>) => via(id).print(id, data);
export const isConnected = (id: string) => via(id).isConnected(id);
export const forget = (id: string) => via(id).forget(id);

export function printingSupported(): boolean {
  return bt.bluetoothSupported() || usb.usbSupported();
}

export async function rememberedPrinters(): Promise<bt.PrinterInfo[]> {
  const [b, u] = await Promise.all([
    bt.rememberedPrinters().catch(() => []),
    usb.rememberedPrinters().catch(() => []),
  ]);
  return [...b, ...u];
}
