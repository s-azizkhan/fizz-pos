"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Free-form design layer on top of the printable menu: uploaded images and text
// boxes the owner drags around each page. Positions are % of the page so the
// screen sheet and the printed A4 line up. Layers live in localStorage per
// store. ponytail: device-local, ~5MB quota caps how many photos fit — move to
// a DB/blob column if owners need it across devices.

export type CanvasPage = "cover" | "body" | "close";

export type CanvasLayer = {
  id: string;
  page: CanvasPage;
  kind: "image" | "text";
  x: number; // % of page width
  y: number; // % of page height
  w: number; // % of page width
  rot?: number; // degrees, clockwise
  src?: string;
  text?: string;
  size?: number; // px
  color?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  font?: "head" | "body";
};

export type MenuCanvas = ReturnType<typeof useMenuCanvas>;

const keyFor = (storeId: string) => `fizz:menu-canvas:${storeId}`;

export function useMenuCanvas(storeId: string) {
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  // Gate saving until the stored design is read, or the first save wipes it.
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- syncing with localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(storeId));
      if (raw) setLayers(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [storeId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(keyFor(storeId), JSON.stringify(layers));
      setSaveError(false);
    } catch {
      setSaveError(true); // quota full — design still works, just won't survive a reload
    }
  }, [hydrated, layers, storeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = useCallback(
    (id: string, patch: Partial<CanvasLayer>) =>
      setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    [],
  );
  const remove = useCallback((id: string) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setSel(null);
  }, []);
  const add = useCallback((layer: Omit<CanvasLayer, "id" | "page">) => {
    const id = crypto.randomUUID();
    setLayers((ls) => [...ls, { ...layer, id, page: pageInView() }]);
    setSel(id);
  }, []);
  // Reorder: front = last in the array (painted on top).
  const restack = useCallback((id: string, toFront: boolean) => {
    setLayers((ls) => {
      const l = ls.find((x) => x.id === id);
      if (!l) return ls;
      const rest = ls.filter((x) => x.id !== id);
      return toFront ? [...rest, l] : [l, ...rest];
    });
  }, []);

  return { layers, sel, setSel, update, remove, add, restack, saveError };
}

// New layers land on whichever sheet sits under the middle of the viewport.
function pageInView(): CanvasPage {
  const mid = window.innerHeight / 2;
  for (const el of document.querySelectorAll<HTMLElement>("[data-canvas-page]")) {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return el.dataset.canvasPage as CanvasPage;
  }
  return "body";
}

// Shrink big photos before they hit localStorage. WebP keeps transparency.
async function fileToDataUrl(file: File, max = 1400): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/webp", 0.88);
}

/** Layers for one sheet. Render inside the `.pdf-page` section. */
export function CanvasLayerHost({
  page,
  canvas,
  editable,
}: {
  page: CanvasPage;
  canvas: MenuCanvas;
  editable: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { layers, sel, setSel, update } = canvas;
  const mine = layers.filter((l) => l.page === page);

  // One pointer handler for move / resize / rotate: delta in px → % of sheet.
  const startDrag = (
    e: React.PointerEvent,
    layer: CanvasLayer,
    mode: "move" | "resize" | "rotate",
  ) => {
    if (!editable) return;
    e.stopPropagation();
    setSel(layer.id);
    const host = hostRef.current;
    if (!host) return;
    const { width, height } = host.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { x: layer.x, y: layer.y, w: layer.w };
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rad = ((layer.rot ?? 0) * Math.PI) / 180;
    // Bounding-box center stays the true center under rotation.
    const box = (mode === "move" ? target : target.parentElement!).getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const move = (ev: PointerEvent) => {
      const px = ev.clientX - sx;
      const py = ev.clientY - sy;
      if (mode === "move") {
        update(layer.id, { x: start.x + (px / width) * 100, y: start.y + (py / height) * 100 });
      } else if (mode === "resize") {
        // Project the drag onto the layer's own (rotated) x-axis.
        const along = px * Math.cos(rad) + py * Math.sin(rad);
        update(layer.id, { w: Math.max(4, start.w + (along / width) * 100) });
      } else {
        // Handle sits above the layer, so "straight up" = 0°. Shift snaps to 15°.
        let deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = ((Math.round(deg) % 360) + 360) % 360;
        update(layer.id, { rot: deg > 180 ? deg - 360 : deg });
      }
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={hostRef}
      className="cv-host"
      data-canvas-page={page}
      data-editable={editable ? "1" : undefined}
    >
      {mine.map((l) => (
        <div
          key={l.id}
          className={`cv-layer${sel === l.id ? " is-sel" : ""}`}
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: `${l.w}%`,
            fontSize: l.size,
            color: l.color,
            fontWeight: l.bold ? 700 : 400,
            textAlign: l.align,
            fontFamily: l.font === "body" ? "var(--pg-body)" : "var(--pg-head)",
            transform: l.rot ? `rotate(${l.rot}deg)` : undefined,
          }}
          onPointerDown={(e) => startDrag(e, l, "move")}
        >
          {l.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.src} alt="" draggable={false} />
          ) : (
            <p>{l.text}</p>
          )}
          {editable && sel === l.id && (
            <>
              <span
                className="cv-handle"
                onPointerDown={(e) => startDrag(e, l, "resize")}
                aria-hidden
              />
              <span
                className="cv-rot"
                onPointerDown={(e) => startDrag(e, l, "rotate")}
                title="Drag to rotate · Shift snaps to 15°"
                aria-hidden
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** Toolbar controls: add image/text, and edit the selected layer. */
export function CanvasControls({ canvas }: { canvas: MenuCanvas }) {
  const { layers, sel, setSel, add, update, remove, restack, saveError } = canvas;
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = layers.find((l) => l.id === sel);

  // Delete / Backspace drops the selected layer unless typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (sel && (e.key === "Delete" || e.key === "Backspace")) remove(sel);
      if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, remove, setSel]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      add({ kind: "image", src: await fileToDataUrl(file), x: 30, y: 30, w: 40 });
    } catch {
      alert("That image fizzled — try a PNG, JPG or WebP.");
    }
  };

  return (
    <div className="mpt-group cv-controls">
      <span className="mpt-label">
        Canvas{saveError ? " · not saved, storage full" : ""}
      </span>
      <div className="mpt-chips">
        <button type="button" className="mpt-chip" onClick={() => fileRef.current?.click()}>
          + Image
        </button>
        <button
          type="button"
          className="mpt-chip"
          onClick={() =>
            add({ kind: "text", text: "Today's special", x: 20, y: 20, w: 60, size: 32, bold: true, align: "center", font: "head" })
          }
        >
          + Text
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>

      {cur && (
        <div className="cv-panel">
          {cur.kind === "text" && (
            <>
              <textarea
                value={cur.text}
                onChange={(e) => update(cur.id, { text: e.target.value })}
                rows={2}
                className="cv-input"
                aria-label="Text"
              />
              <label className="cv-field">
                Size
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={cur.size ?? 32}
                  onChange={(e) => update(cur.id, { size: Number(e.target.value) || 32 })}
                  className="cv-input cv-num"
                />
              </label>
              <input
                type="color"
                value={cur.color ?? "#000000"}
                onChange={(e) => update(cur.id, { color: e.target.value })}
                className="cv-color"
                aria-label="Text color"
              />
              <button
                type="button"
                className={`mpt-chip${cur.bold ? " is-active" : ""}`}
                onClick={() => update(cur.id, { bold: !cur.bold })}
              >
                Bold
              </button>
              <select
                value={cur.align ?? "left"}
                onChange={(e) => update(cur.id, { align: e.target.value as CanvasLayer["align"] })}
                className="cv-input"
                aria-label="Align"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
              <select
                value={cur.font ?? "head"}
                onChange={(e) => update(cur.id, { font: e.target.value as CanvasLayer["font"] })}
                className="cv-input"
                aria-label="Font"
              >
                <option value="head">Heading font</option>
                <option value="body">Body font</option>
              </select>
            </>
          )}
          <label className="cv-field">
            Rotate
            <input
              type="number"
              min={-180}
              max={180}
              value={cur.rot ?? 0}
              onChange={(e) => update(cur.id, { rot: Number(e.target.value) || 0 })}
              className="cv-input cv-num"
            />
            °
          </label>
          <button type="button" className="mpt-chip" onClick={() => restack(cur.id, true)}>
            Front
          </button>
          <button type="button" className="mpt-chip" onClick={() => restack(cur.id, false)}>
            Back
          </button>
          <button type="button" className="mpt-chip cv-del" onClick={() => remove(cur.id)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export const CANVAS_CSS = `
.cv-host { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.cv-layer { position: absolute; pointer-events: auto; line-height: 1.15; transform-origin: center; }
.cv-host:not([data-editable]) .cv-layer { pointer-events: none; }
.cv-host[data-editable] .cv-layer { cursor: move; touch-action: none; }
.cv-host[data-editable] .cv-layer:hover { outline: 1px dashed #38E1D6; }
.cv-layer.is-sel { outline: 2px solid #C6F432 !important; }
.cv-layer img { display: block; width: 100%; height: auto; user-select: none; }
.cv-layer p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; user-select: none; }
.cv-rot {
  position: absolute; left: 50%; top: -30px; width: 14px; height: 14px;
  margin-left: -7px; background: #38E1D6; border: 2px solid #0E1116;
  border-radius: 50%; cursor: grab; touch-action: none;
}
.cv-rot::after {
  content: ""; position: absolute; left: 50%; top: 12px; width: 2px; height: 16px;
  margin-left: -1px; background: #38E1D6;
}
.cv-handle {
  position: absolute; right: -7px; bottom: -7px; width: 14px; height: 14px;
  background: #C6F432; border: 2px solid #0E1116; border-radius: 4px;
  cursor: nwse-resize; touch-action: none;
}
.cv-controls { flex-basis: 100%; }
.cv-panel { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.cv-input {
  background: #1A1F28; color: #F4F1E9; border: 1px solid #2A313C;
  border-radius: 12px; padding: 6px 10px; font-size: 13px; font-family: inherit;
}
.cv-input:focus { outline: none; border-color: #C6F432; }
textarea.cv-input { min-width: 220px; resize: vertical; }
.cv-num { width: 64px; margin-left: 6px; }
.cv-field { display: inline-flex; align-items: center; color: #8A93A1; font-size: 12px; }
.cv-color { width: 34px; height: 30px; padding: 0; border: 1px solid #2A313C; border-radius: 8px; background: none; cursor: pointer; }
.cv-del:hover { border-color: #E2655A; color: #E2655A; }
@media print {
  .cv-layer { outline: none !important; }
  .cv-handle, .cv-rot { display: none !important; }
}
`;
