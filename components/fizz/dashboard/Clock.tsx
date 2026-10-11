"use client";

import { useSyncExternalStore } from "react";

const fmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

const COLOR: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {
  hour: "text-fizz",
  minute: "text-fizz/90",
  second: "text-fizz/80",
  dayPeriod: "text-cream",
};

// Snapshot is whole seconds (stable between ticks); null on the server so SSR
// and hydration match.
export default function Clock() {
  const sec = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );
  return (
    <time className="ml-auto shrink-0 rounded-full border border-ink-line bg-ink-soft px-4 py-1 font-display text-2xl font-bold tabular-nums text-fizz/70">
      {sec !== null &&
        fmt.formatToParts(new Date(sec * 1000)).map((p, i) => (
          <span key={i} className={COLOR[p.type]}>
            {p.value}
          </span>
        ))}
    </time>
  );
}
