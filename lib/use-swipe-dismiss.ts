"use client";

import { useState } from "react";

// Drag a bottom sheet down to dismiss it, the way every native sheet works.
//
// Pointer events only — no library, no gesture state machine. The sheet follows
// the finger 1:1 while dragging (transition disabled), then either snaps back
// or closes on release.
//
// ponytail: no rubber-banding, no velocity/fling detection. A fast flick still
// closes because the threshold is small; add velocity if a short, fast flick
// starts feeling ignored.
const CLOSE_AFTER_PX = 110;

type Drag = { from: number; offset: number };

export function useSwipeDismiss(onClose: () => void) {
  const [drag, setDrag] = useState<Drag | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    // Ignore mouse drags — this is a touch affordance, and on a mouse it would
    // fight text selection.
    if (e.pointerType === "mouse") return;
    // Don't hijack a scroll that starts inside scrolled-down content.
    if (e.currentTarget.scrollTop > 0) return;
    setDrag({ from: e.clientY, offset: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    // Downward only; an upward drag is a scroll, so hand it back.
    setDrag((d) => (d ? { ...d, offset: Math.max(0, e.clientY - d.from) } : null));
  }

  function end() {
    if (!drag) return;
    const travelled = drag.offset;
    setDrag(null);
    if (travelled > CLOSE_AFTER_PX) onClose();
  }

  return {
    dragging: drag !== null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
    style: {
      transform: drag?.offset ? `translateY(${drag.offset}px)` : undefined,
      transition: drag ? "none" : undefined,
    } as React.CSSProperties,
  };
}
