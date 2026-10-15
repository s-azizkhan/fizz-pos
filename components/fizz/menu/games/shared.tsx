"use client";

import { useEffect, type ReactNode } from "react";
import { Confetti } from "../WelcomeCards";

// Bits every pocket game shares: best-score storage, the start/over overlay,
// swipe + arrow-key input.

export function best(key: string): number {
  try {
    return Number(localStorage.getItem(`fizz-game-${key}`) ?? 0) || 0;
  } catch {
    return 0;
  }
}
export function saveBest(key: string, v: number, lowerIsBetter = false): boolean {
  const b = best(key);
  if (!b || (lowerIsBetter ? v < b : v > b)) {
    try {
      localStorage.setItem(`fizz-game-${key}`, String(v));
    } catch {}
    return true;
  }
  return false;
}

export const boardStyle = {
  borderRadius: "var(--m-radius)",
  borderColor: "var(--m-line)",
  backgroundColor: "var(--m-surface)",
} as const;

export function Overlay({
  accent,
  burst,
  title,
  big,
  bestLabel,
  cta,
  hint,
  onStart,
  children,
}: {
  accent: string;
  burst: number;
  title?: string;
  big?: ReactNode;
  bestLabel?: string | null;
  cta: string;
  hint?: string;
  onStart: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--m-bg)]/70 p-6 text-center backdrop-blur-sm">
      {burst > 0 && <Confetti key={burst} accent={accent} />}
      {title && <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--m-muted)]">{title}</p>}
      {big !== undefined && <p className="text-[44px] font-bold leading-none">{big}</p>}
      {bestLabel && <p className="text-[13px] text-[var(--m-muted)]">{bestLabel}</p>}
      {children}
      <button
        type="button"
        onClick={onStart}
        className="touch-manipulation rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-95"
        style={{ backgroundColor: accent, color: "var(--m-bg)" }}
      >
        {cta}
      </button>
      {hint && <p className="text-[12px] text-[var(--m-muted)]">{hint}</p>}
    </div>
  );
}

export type Dir = "up" | "down" | "left" | "right";

// Swipe on `el` (touch/pen/mouse) or arrow keys anywhere → onDir. The swipe
// needs 24px of travel so a tap doesn't count.
export function useDirInput(el: HTMLElement | null, onDir: (d: Dir) => void, active: boolean) {
  useEffect(() => {
    if (!el || !active) return;
    let start: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < (e.pointerType === "touch" ? 14 : 24)) return;
      onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    };
    const key = (e: KeyboardEvent) => {
      const d = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as Record<string, Dir>)[e.key];
      if (!d) return;
      e.preventDefault();
      onDir(d);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
    };
  }, [el, onDir, active]);
}

// Theme colors off the canvas element, for drawing.
export function themeInk(el: HTMLElement) {
  const css = getComputedStyle(el);
  const get = (k: string, f: string) => css.getPropertyValue(k).trim() || f;
  return { text: get("--m-text", "#fff"), muted: get("--m-muted", "#888"), line: get("--m-line", "#333"), bg: get("--m-bg", "#000") };
}
