"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

// Rings when a guest places an order from the public menu, on every dashboard
// screen, until someone taps Stop. Stop is per device and per order: a newer
// order rings again. Accepting the order in the POS clears it for everyone.
//
// ponytail: a 15s poll (three columns, ≤20 rows) — fine on a weak link, but it
// keeps a serverless DB awake while a dashboard is open. Swap for push
// (SSE / web push) if that bill matters.
const POLL_MS = 15_000;
const RING_EVERY_MS = 2_000;
const ACK_KEY = "fizz-web-acked";

function readAcked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeAcked(ids: string[]) {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify(ids));
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

export default function WebOrderAlarm() {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.orders.webPending.queryOptions(),
    refetchInterval: POLL_MS,
    // A counter tablet often has the dashboard in a background tab.
    refetchIntervalInBackground: true,
  });
  const [acked, setAcked] = useState<string[] | null>(null);
  useEffect(() => {
    // localStorage is client-only; read after mount so SSR and hydration agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAcked(readAcked());
  }, []);

  const ringing = acked ? (data ?? []).filter((o) => !acked.includes(o.id)) : [];
  useChime(ringing.length > 0);

  if (ringing.length === 0) return null;

  // Ack everything pending right now; keep only live ids so storage stays tiny.
  const stop = () => {
    const ids = (data ?? []).map((o) => o.id);
    setAcked(ids);
    writeAcked(ids);
  };
  const [first, ...rest] = ringing;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-lg items-center gap-3 rounded-fizz border border-fizz bg-ink-soft px-4 py-3 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]"
    >
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fizz opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-fizz" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-cream">
        <span className="font-semibold text-fizz">New web order</span>{" "}
        <span className="font-display font-bold">#{first.number}</span>
        {rest.length > 0 && <span className="text-steam"> +{rest.length} more</span>}
      </p>
      <Link
        href="/dashboard/orders"
        onClick={stop}
        className="shrink-0 rounded-fizz border border-ink-line px-3 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
      >
        Open
      </Link>
      <button
        onClick={stop}
        className="shrink-0 rounded-fizz bg-fizz px-4 py-2 text-sm font-bold text-ink transition-transform hover:scale-105"
      >
        Stop
      </button>
    </div>
  );
}
