"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Bubbles from "../Bubbles";

// Decided once per page load and then frozen, so getSnapshot stays stable
// across renders (React requires a cached value) and a client-side navigation
// can never re-trigger the launch screen.
let decision: boolean | null = null;

function shouldSplash() {
  if (decision === null) {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari predates display-mode and reports this instead.
      (window.navigator as { standalone?: boolean }).standalone === true;
    decision = standalone && !sessionStorage.getItem("fizz-launched");
  }
  return decision;
}

// Never resubscribes — the value is fixed for the life of the page.
const subscribe = () => () => {};

// Branded launch screen for the installed app. iOS shows a static
// apple-touch-startup-image before this paints; this picks up where that ends,
// so the handoff reads as one continuous launch instead of two flashes.
//
// Browser tabs skip it entirely — nobody wants a splash on a page refresh.
export default function SplashScreen() {
  const active = useSyncExternalStore(subscribe, shouldSplash, () => false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    sessionStorage.setItem("fizz-launched", "1");
    const out = setTimeout(() => setLeaving(true), 850);
    const gone = setTimeout(() => setDone(true), 1250);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, [active]);

  if (!active || done) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-ink transition-opacity duration-400 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Bubbles />
      <div className="relative flex flex-col items-center gap-5">
        <span className="fizz-splash-mark font-display text-6xl font-bold tracking-tight">
          Fi<span className="text-fizz">zz</span>
          <span className="align-super text-xl text-bubble">●</span>
        </span>
        <span className="fizz-splash-bar h-0.5 w-24 origin-left rounded-full bg-fizz" />
      </div>
    </div>
  );
}
