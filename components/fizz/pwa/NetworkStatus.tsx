"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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

  if (online && !restored) return null;

  const offline = !online;

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
        {offline ? "Offline — nothing will save until you're back" : "Back online"}
      </span>
    </div>
  );
}
