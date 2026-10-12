"use client";

import { useEffect } from "react";
import { bluetoothSupported, keepAlive } from "@/lib/print/transport";
import { isUsbId } from "@/lib/print/usb";
import { usePrinter } from "@/lib/store/printer";

type Sentinel = { release(): Promise<void> };
type WakeLock = { request(type: "screen"): Promise<Sentinel> };

// Holds this POS's Bluetooth printer link open across the dashboard: connects
// on load, heartbeats, reconnects on drop. Also keeps the screen awake, since a
// locked phone/tablet suspends the tab and the OS drops the link with it.
// ponytail: wake lock runs on every dashboard page while a Bluetooth printer is
// set, desktops included. Scope it to /dashboard/pos if that's annoying.
// `on` = the store's Printers feature; off silences every device print.
export default function PrinterKeepAlive({ on }: { on: boolean }) {
  const deviceId = usePrinter((s) => s.deviceId);

  useEffect(() => {
    usePrinter.setState({ off: !on });
  }, [on]);

  useEffect(() => {
    if (!on || !deviceId || isUsbId(deviceId) || !bluetoothSupported()) return;
    const stop = keepAlive(deviceId);

    const wake = (navigator as unknown as { wakeLock?: WakeLock }).wakeLock;
    let lock: Sentinel | null = null;
    let done = false;
    // The browser releases the lock whenever the tab is hidden; take it back.
    const grab = () => {
      if (!wake || document.visibilityState !== "visible") return;
      wake.request("screen").then(
        (l) => {
          if (done) l.release().catch(() => {});
          else lock = l;
        },
        () => {}, // battery saver or policy said no; printing still works
      );
    };
    document.addEventListener("visibilitychange", grab);
    grab();

    return () => {
      done = true;
      stop();
      document.removeEventListener("visibilitychange", grab);
      lock?.release().catch(() => {});
    };
  }, [deviceId, on]);

  return null;
}
