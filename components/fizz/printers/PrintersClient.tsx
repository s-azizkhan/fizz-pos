"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  bluetoothSupported,
  canRememberPrinters,
  forget,
  isConnected,
  pairBluetooth,
  pairLike,
  pairUsb,
  print,
  rememberedPrinters,
  usbSupported,
  type PrinterInfo,
} from "@/lib/print/transport";
import { isUsbId } from "@/lib/print/usb";
import { testTicket } from "@/lib/print/templates";
import { usePrinter } from "@/lib/store/printer";
import { toast } from "@/lib/store/toast";
import { Chip } from "@/components/fizz/ui/controls";

const noop = () => () => {};

// A cancelled picker throws NotFoundError — that's the user saying no, not a fault.
function cancelled(e: unknown) {
  return e instanceof DOMException && e.name === "NotFoundError";
}

export default function PrintersClient() {
  const { deviceId, deviceName, paper, autoReceipt, autoKot, setPrinter, setPaper, setAuto } =
    usePrinter();
  // Browser-only facts; the server render assumes "not yet known". Prefs
  // rehydrate from localStorage synchronously, so "mounted" = hydrated.
  // (usePrinter.persist doesn't exist on the server — no storage there.)
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const btOk = useSyncExternalStore(noop, bluetoothSupported, () => false);
  const usbOk = useSyncExternalStore(noop, usbSupported, () => false);
  const remembers = useSyncExternalStore(noop, canRememberPrinters, () => false);
  const secure = useSyncExternalStore(noop, () => window.isSecureContext, () => true);

  const [known, setKnown] = useState<PrinterInfo[]>([]);
  const [busy, setBusy] = useState<"bt" | "usb" | "test" | null>(null);
  const [, bump] = useState(0); // re-read isConnected() after an action

  useEffect(() => {
    if (btOk || usbOk) rememberedPrinters().then(setKnown, () => {});
  }, [btOk, usbOk]);

  async function handlePair(kind: "bt" | "usb", again?: string) {
    setBusy(kind);
    try {
      const p = await (again ? pairLike(again) : kind === "usb" ? pairUsb() : pairBluetooth());
      setPrinter(p);
      setKnown((k) => (k.some((x) => x.id === p.id) ? k : [...k, p]));
      toast.success(`${p.name} connected`);
    } catch (e) {
      if (!cancelled(e)) toast.error(e instanceof Error ? e.message : "Couldn't connect");
    } finally {
      setBusy(null);
      bump((n) => n + 1);
    }
  }

  async function handleTest() {
    if (!deviceId) return;
    setBusy("test");
    try {
      await print(deviceId, testTicket());
      toast.success("Test ticket sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Print fizzled");
    } finally {
      setBusy(null);
      bump((n) => n + 1);
    }
  }

  async function handleForget(id: string) {
    await forget(id).catch(() => {});
    setKnown((k) => k.filter((x) => x.id !== id));
    if (id === deviceId) setPrinter(null);
    bump((n) => n + 1);
  }

  if (!hydrated) return null;

  if (!btOk && !usbOk) {
    return (
      <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Printing unavailable
        </p>
        <p className="mt-3 max-w-[60ch] text-cream">
          {!secure
            ? "Printers need a secure (https) connection. Open Fizz over https to pair one."
            : "This browser can't talk to Bluetooth or USB printers. Use Chrome or Edge on Android, Windows, Mac or Linux. On iPhone or iPad, open Fizz in the Bluefy browser."}
        </p>
        <p className="mt-3 max-w-[60ch] text-sm text-steam">
          Tickets still print through the system print dialog in the meantime.
        </p>
      </div>
    );
  }

  const others = known.filter((k) => k.id !== deviceId);
  const live = deviceId ? isConnected(deviceId) : false;
  const usbDefault = !!deviceId && isUsbId(deviceId);

  return (
    <div className="space-y-6">
      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Default printer
        </p>
        {deviceId ? (
          <div className="mt-3 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-fizz" : "bg-steam"}`} />
            <p className="font-display text-2xl font-bold text-cream">{deviceName}</p>
            <span className="text-sm text-steam">
              {live ? "Connected" : usbDefault ? "Ready — wakes on next print" : "Idle"}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-cream">
            None yet. Turn the printer on (or plug it in), then pair it.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {/* USB reopens a granted printer on the next print — no picker needed. */}
          {deviceId && !live && !usbDefault && (
            <button
              onClick={() => handlePair("bt", deviceId)}
              disabled={busy !== null}
              className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
            >
              Connect
            </button>
          )}
          {btOk && (
            <button
              onClick={() => handlePair("bt")}
              disabled={busy !== null}
              className={
                deviceId && !live && !usbDefault
                  ? "rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz disabled:opacity-60"
                  : "rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
              }
            >
              {busy === "bt" ? "Searching…" : "Pair Bluetooth"}
            </button>
          )}
          {usbOk && (
            <button
              onClick={() => handlePair("usb")}
              disabled={busy !== null}
              className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz disabled:opacity-60"
            >
              {busy === "usb" ? "Searching…" : "Pair USB"}
            </button>
          )}
          {deviceId && (
            <>
              <button
                onClick={handleTest}
                disabled={busy !== null}
                className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz disabled:opacity-60"
              >
                {busy === "test" ? "Printing…" : "Test print"}
              </button>
              <button
                onClick={() => handleForget(deviceId)}
                disabled={busy !== null}
                className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A] disabled:opacity-60"
              >
                Forget
              </button>
            </>
          )}
        </div>

        {usbOk && (
          <p className="mt-4 max-w-[60ch] text-sm text-steam">
            USB on Windows: the printer&apos;s own driver blocks the browser — switch
            it to WinUSB with Zadig first.
          </p>
        )}

        {!remembers && deviceId && !usbDefault && (
          <p className="mt-4 max-w-[60ch] text-sm text-steam">
            This browser forgets printers when the tab closes — tap Connect once
            at the start of each shift.
          </p>
        )}
      </section>

      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Paper width
        </p>
        <div className="mt-4 flex gap-2">
          {([58, 80] as const).map((w) => (
            <Chip key={w} active={paper === w} onClick={() => setPaper(w)}>
              {w}mm
            </Chip>
          ))}
        </div>
      </section>

      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Auto-print
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip active={autoReceipt} onClick={() => setAuto({ autoReceipt: !autoReceipt })}>
            Receipt on payment
          </Chip>
          <Chip active={autoKot} onClick={() => setAuto({ autoKot: !autoKot })}>
            KOT on save &amp; pay
          </Chip>
        </div>
        <p className="mt-4 max-w-[60ch] text-sm text-steam">
          Kitchen tickets only carry what&apos;s new — adding a flat white to a
          saved tab prints just the flat white.
        </p>
      </section>

      <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Ticket design
        </p>
        <p className="mt-3 max-w-[60ch] text-cream">
          Reorder, hide or add lines on the receipt and KOT, with a live paper preview.
        </p>
        <Link
          href="/dashboard/printers/design"
          className="mt-6 inline-block rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
        >
          Design tickets
        </Link>
      </section>

      {others.length > 0 && (
        <section className="rounded-fizz border border-ink-line bg-ink-soft p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Other paired printers
          </p>
          <ul className="mt-4 divide-y divide-ink-line">
            {others.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-cream">{p.name}</span>
                <div className="flex gap-2">
                  <Chip active={false} onClick={() => setPrinter(p)}>
                    Make default
                  </Chip>
                  <Chip active={false} tone="danger" onClick={() => handleForget(p.id)}>
                    Forget
                  </Chip>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
