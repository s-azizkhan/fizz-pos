"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Put `rows` in `order` (ids). Rows missing from `order` (created since) go on
// the end; ids with no row (deleted since) drop out.
export function applyOrder<T extends { id: string }>(rows: T[], order: string[] | null): T[] {
  if (!order) return rows;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set(order);
  return [
    ...order.flatMap((id) => byId.get(id) ?? []),
    ...rows.filter((r) => !seen.has(r.id)),
  ];
}

function moveTo(list: string[], id: string, to: number) {
  const next = list.filter((x) => x !== id);
  next.splice(to, 0, id);
  return next;
}

// Pointer-driven drag-to-reorder. Pointer events (not HTML5 drag & drop,
// which never fires on touch) so it works with mouse, finger and pen. Rows
// carry `data-sort={group}` + `data-id`; the grip from `handle(id)` starts the
// drag. Arrow Up/Down on a focused grip moves one step for keyboard users.
export function useDragSort(
  group: string,
  ids: string[],
  onCommit: (ids: string[]) => void,
) {
  type Drag = { id: string; order: string[] };
  const [drag, setDrag] = useState<Drag | null>(null);
  // Window listeners read the live drag + latest props through refs.
  const live = useRef<Drag | null>(null);
  const latest = useRef({ ids, onCommit });
  const start = useRef<{ el: HTMLElement; y: number } | null>(null);
  const dragId = drag?.id ?? null;

  useEffect(() => {
    latest.current = { ids, onCommit };
  });

  // Starting a drag can reflow the page (categories collapse); scroll so the
  // grip lands back under the finger instead of jumping away from it.
  useLayoutEffect(() => {
    const s = start.current;
    if (!dragId || !s) return;
    const r = s.el.getBoundingClientRect();
    window.scrollBy(0, r.top + r.height / 2 - s.y);
    start.current = null;
  }, [dragId]);

  // Move/up go on window, not the grip: React moving the dragged row in the
  // DOM drops the grip's pointer capture, and the drop would be lost.
  useEffect(() => {
    if (!dragId) return;
    const put = (d: Drag | null) => {
      live.current = d;
      setDrag(d);
    };
    function move(e: PointerEvent) {
      const d = live.current;
      if (!d) return;
      // ponytail: edge auto-scroll only ticks while the pointer moves; add a
      // rAF loop if holding still at the edge needs to keep scrolling.
      const edge = 72;
      if (e.clientY < edge) window.scrollBy(0, -14);
      else if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 14);

      const el = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>(`[data-sort="${group}"]`);
      const over = el?.dataset.id;
      if (!el || !over || over === d.id) return;
      const from = d.order.indexOf(d.id);
      const to = d.order.indexOf(over);
      if (to < 0) return;
      // Swap only once the pointer crosses the target's middle, so rows of
      // different heights don't flip back and forth.
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if ((to > from && e.clientY > mid) || (to < from && e.clientY < mid)) {
        put({ id: d.id, order: moveTo(d.order, d.id, to) });
      }
    }
    function end(commit: boolean) {
      const d = live.current;
      const { ids, onCommit } = latest.current;
      if (commit && d && d.order.join() !== ids.join()) onCommit(d.order);
      put(null);
    }
    const up = () => end(true);
    const cancel = () => end(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragId, group]);

  function handle(id: string) {
    return {
      type: "button" as const,
      "aria-label": "Drag to reorder (or use arrow keys)",
      "data-dragging": dragId === id || undefined,
      onPointerDown(e: React.PointerEvent<HTMLElement>) {
        if (e.button !== 0) return;
        e.preventDefault();
        start.current = { el: e.currentTarget, y: e.clientY };
        live.current = { id, order: ids };
        setDrag(live.current);
      },
      onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        const i = ids.indexOf(id);
        if (!dir || i + dir < 0 || i + dir >= ids.length) return;
        e.preventDefault();
        onCommit(moveTo(ids, id, i + dir));
      },
    };
  }

  return { order: drag?.order ?? null, dragId, handle };
}
