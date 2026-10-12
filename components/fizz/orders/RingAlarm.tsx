"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// A banner that chimes in a loop until someone taps Stop. Used for guest web
// orders (every dashboard screen) and new kitchen tickets (KOT board). Stop is
// per device and per item — a newer item rings again; items that leave the
// list (accepted, cooked) stop ringing on their own.
const RING_EVERY_MS = 2_000;

function readAcked(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function writeAcked(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage blocked — Stop still works until the next reload.
  }
}

// A two-note "ding-ding", synthesized: no audio file to download or cache.
function chime(ctx: AudioContext) {
  const t = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const at = t + i * 0.18;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.42);
  });
}

// Browsers only let a page make sound after the user has interacted with it.
// Any tap or key on the dashboard unlocks audio for the session.
function useChime(on: boolean) {
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      ctx.current ??= new AudioContext();
      if (ctx.current.state === "suspended") void ctx.current.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
    const ring = () => {
      ctx.current ??= new AudioContext();
      if (ctx.current.state === "suspended") void ctx.current.resume();
      chime(ctx.current);
      navigator.vibrate?.(200);
    };
    ring();
    const loop = setInterval(ring, RING_EVERY_MS);
    // The tab title blinks too, for a counter screen sitting in the background.
    const title = document.title;
    let flip = false;
    const blink = setInterval(() => {
      flip = !flip;
      document.title = flip ? "● New order — Fizz" : title;
    }, 1000);
    return () => {
      clearInterval(loop);
      clearInterval(blink);
      document.title = title;
    };
  }, [on]);
}

export default function RingAlarm({
  items,
  storageKey,
  label,
  href,
  position = "top",
  onAccept,
}: {
  /** What's waiting. Ringing = any item this device hasn't stopped yet. */
  items: { id: string; number: string }[];
  /** localStorage key for this alarm's acknowledged ids. */
  storageKey: string;
  label: string;
  /** Where "Open" goes; omit when the items are already on screen. */
  href?: string;
  position?: "top" | "bottom";
  /** Shows an Accept button that handles the first ringing item. */
  onAccept?: (id: string) => void | Promise<unknown>;
}) {
  const [acked, setAcked] = useState<string[] | null>(null);
  useEffect(() => {
    // localStorage is client-only; read after mount so SSR and hydration agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAcked(readAcked(storageKey));
  }, [storageKey]);

  const ringing = acked ? items.filter((o) => !acked.includes(o.id)) : [];
  useChime(ringing.length > 0);

  if (ringing.length === 0) return null;

  // Ack everything waiting right now; keep only live ids so storage stays tiny.
  const stop = () => {
    const ids = items.map((o) => o.id);
    setAcked(ids);
    writeAcked(storageKey, ids);
  };
  const [first, ...rest] = ringing;

  return (
    <div
      role="alert"
      className={`fixed inset-x-3 z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-fizz border border-fizz bg-ink-soft px-4 py-3 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] ${
        position === "top" ? "top-3" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-6"
      }`}
    >
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fizz opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-fizz" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-cream">
        <span className="font-semibold text-fizz">{label}</span>{" "}
        <span className="font-display font-bold">#{first.number}</span>
        {rest.length > 0 && <span className="text-steam"> +{rest.length} more</span>}
      </p>
      {href && (
        <Link
          href={href}
          onClick={stop}
          className="shrink-0 rounded-fizz border border-ink-line px-3 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
        >
          Open
        </Link>
      )}
      {onAccept && (
        <button
          onClick={() => void onAccept(first.id)}
          className="shrink-0 rounded-fizz bg-fizz px-4 py-2 text-sm font-bold text-ink transition-transform hover:scale-105"
        >
          Accept
        </button>
      )}
      <button
        onClick={stop}
        className={`shrink-0 rounded-fizz px-4 py-2 text-sm font-bold transition-transform hover:scale-105 ${
          onAccept ? "border border-ink-line text-cream" : "bg-fizz text-ink"
        }`}
      >
        Stop
      </button>
    </div>
  );
}
