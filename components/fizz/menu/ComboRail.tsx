"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Combo slider: the current card sits centred with its neighbours peeking in
// dimmed on both sides; steps one card every 3s, looping forever. The caller
// renders the cards three times (clone, original, clone) so there's always a
// neighbour on each side; when we drift into a clone we jump to the matching
// original without animating (it looks identical), so the loop is seamless.
// Guests can swipe/drag a card at a time; hover or a swipe pauses autoplay.
export default function ComboRail({ children, className }: { children: ReactNode; className: string }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const kids = el.children as HTMLCollectionOf<HTMLElement>;
    // Cards per copy; a lone combo isn't tripled, so there's nothing to slide.
    const n = kids.length >= 6 ? kids.length / 3 : 0;
    if (!n) return;
    let idx = n;
    let hover = false;
    let pausedUntil = 0;
    let drag: { x: number; dx: number } | null = null;

    // Shift that puts card i's centre on the viewport's centre.
    const at = (i: number) => kids[i].offsetLeft + kids[i].offsetWidth / 2 - el.parentElement!.clientWidth / 2;
    const go = (i: number, animate: boolean) => {
      idx = i;
      el.style.transition = animate ? "transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
      el.style.transform = `translateX(${-at(i)}px)`;
      // Everything but the current card fades back (styled via data-[dim]: on the card).
      for (let j = 0; j < kids.length; j++) kids[j].toggleAttribute("data-dim", j !== i);
    };
    // Landed on a clone: swap to the matching original, unanimated.
    const settle = () => {
      if (idx >= 2 * n) go(idx - n, false);
      else if (idx < n) go(idx + n, false);
    };
    const recentre = () => go(idx, false);
    go(n, false);

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setInterval(() => {
      if (!still && !hover && !drag && Date.now() >= pausedUntil) go(idx + 1, true);
    }, 3000);

    const down = (e: PointerEvent) => {
      settle();
      drag = { x: e.clientX, dx: 0 };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      drag.dx = e.clientX - drag.x;
      el.style.transition = "none";
      el.style.transform = `translateX(${-at(idx) + drag.dx}px)`;
    };
    const up = () => {
      if (!drag) return;
      const { dx } = drag;
      drag = null;
      pausedUntil = Date.now() + 4000;
      // A drag that moved shouldn't also tap the "+" it started on.
      if (Math.abs(dx) > 5) el.addEventListener("click", (e) => e.stopPropagation(), { capture: true, once: true });
      const step = dx < -40 ? 1 : dx > 40 ? -1 : 0;
      go(Math.max(0, Math.min(idx + step, 3 * n - 1)), true);
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const leave = () => {
      hover = false;
    };
    // Children's own transitions (button hovers) bubble here too — only ours counts.
    const ended = (e: TransitionEvent) => {
      if (e.target === el) settle();
    };
    el.addEventListener("transitionend", ended);
    el.addEventListener("pointerdown", down);
    window.addEventListener("resize", recentre);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      clearInterval(timer);
      el.removeEventListener("transitionend", ended);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("resize", recentre);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* pan-y: vertical swipes still scroll the page, horizontal ones drag us. */}
      <div ref={track} className="flex touch-pan-y select-none gap-3 py-2 will-change-transform">
        {children}
      </div>
    </div>
  );
}
