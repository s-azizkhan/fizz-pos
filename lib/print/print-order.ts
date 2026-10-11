import { NeedsPairingError, pairLike, print, printingSupported } from "./transport";
import type { KotData, PrintCfg } from "./templates";
import { usePrinter } from "@/lib/store/printer";
import { toast } from "@/lib/store/toast";

// Send a ticket to this device's default printer. Resolves false when there's
// no printer to use, so callers can fall back (window.print) or skip.
// `interactive` = called from a tap: if the browser forgot the printer (full
// page load without getDevices()), reopen the picker instead of failing.
export async function printToDefault(
  build: (cfg: PrintCfg) => Uint8Array<ArrayBuffer>,
  { interactive = false } = {},
): Promise<boolean> {
  const { deviceId, paper, receipt, kot, setPrinter } = usePrinter.getState();
  if (!deviceId || !printingSupported()) return false;
  const cfg = { paper, receipt, kot };
  try {
    await print(deviceId, build(cfg));
  } catch (e) {
    if (!interactive || !(e instanceof NeedsPairingError)) throw e;
    const p = await pairLike(deviceId);
    setPrinter(p);
    await print(p.id, build(cfg));
  }
  return true;
}

// Fire-and-forget for auto-print: a failed ticket must never block the sale.
export function autoPrint(
  what: string,
  build: (cfg: PrintCfg) => Uint8Array<ArrayBuffer>,
): void {
  printToDefault(build).catch((e) => {
    toast.error(
      e instanceof NeedsPairingError
        ? `${what} didn't print — reconnect the printer in Printers.`
        : `${what} didn't print — ${e instanceof Error ? e.message : "printer fizzled"}`,
      6000,
    );
  });
}

type KotLine = { key: string; name: string; variantName: string | null; quantity: number };

// Lines the kitchen hasn't seen yet: anything new, or the extra quantity on a
// line that was already sent. Removed/reduced lines are ignored.
// ponytail: "sent" = the tab as last saved. A tab saved while the printer was
// down won't reprint those lines later — use the KOT page to reprint.
export function kotDelta(lines: KotLine[], sent: KotLine[]): KotData["items"] {
  const before = new Map(sent.map((l) => [l.key, l.quantity]));
  return lines
    .map((l) => ({
      name: l.name,
      variantName: l.variantName,
      quantity: l.quantity - (before.get(l.key) ?? 0),
    }))
    .filter((l) => l.quantity > 0);
}
