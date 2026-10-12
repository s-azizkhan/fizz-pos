"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { outboxCounts, outboxSnapshot, subscribeOutbox } from "@/lib/store/outbox";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// navigator.onLine is only trustworthy for the online↔offline edge, which is
// exactly what we use it for.
const isOnline = () => navigator.onLine;

// A café's wifi drops. Staff need to know before they ring an order they think
// went through — so offline is loud and sticky, and coming back is a brief
// confirmation that clears itself.
export default function NetworkStatus() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);
  const [restored, setRestored] = useState(false);
  const { pending, failed } = outboxCounts(
    useSyncExternalStore(subscribeOutbox, outboxSnapshot, () => null),
  );

  useEffect(() => {
    if (online) return;
    // Once we've actually been offline, announce the recovery — but only then,
    // so a normal page load doesn't flash "Back online".
    return () => setRestored(true);
  }, [online]);

  useEffect(() => {
    if (!restored) return;
    const t = setTimeout(() => setRestored(false), 2600);
    return () => clearTimeout(t);
  }, [restored]);

  // Queued sales keep the pill up even online, until the flush clears them.
  const queued = pending + failed;
  if (online && !restored && !queued) return null;

  const offline = !online || failed > 0;
  const label = failed
    ? `${failed} offline order${failed > 1 ? "s" : ""} couldn't sync — tell a manager`
    : !online
      ? pending
        ? `Offline — ${pending} order${pending > 1 ? "s" : ""} saved on this device`
        : "Offline — new orders save on this device"
      : pending
        ? `Syncing ${pending} offline order${pending > 1 ? "s" : ""}…`
        : "Back online";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fizz-toast pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[150] flex justify-center px-4 pt-2"
    >
      <span
        className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur ${
          offline
            ? "border-[#E2655A]/40 bg-[#E2655A]/15 text-[#E2655A]"
            : "border-fizz/40 bg-fizz/15 text-fizz"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            offline ? "animate-pulse bg-[#E2655A]" : "bg-fizz"
          }`}
        />
        {label}
      </span>
    </div>
  );
}
