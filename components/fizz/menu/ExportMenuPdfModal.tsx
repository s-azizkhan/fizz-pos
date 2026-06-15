"use client";

import { useState } from "react";
import {
  MENU_COLOR_SCHEMES,
  DEFAULT_MENU_COLOR_SCHEME,
} from "@/components/fizz/menu/print-styles";
import {
  MENU_LAYOUTS,
  DEFAULT_MENU_LAYOUT,
} from "@/components/fizz/menu/menu-layouts";
import {
  MENU_BG_PACKS,
  DEFAULT_MENU_BG_PACK,
} from "@/components/fizz/menu/bg-packs";

// Picks a color scheme + layout + background, shows a live preview (the real
// /menu-pdf route in an embed iframe), then opens it full-screen for browser
// print / Save-as-PDF.
export default function ExportMenuPdfModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [schemeId, setSchemeId] = useState(DEFAULT_MENU_COLOR_SCHEME);
  const [layoutId, setLayoutId] = useState(DEFAULT_MENU_LAYOUT);
  const [packId, setPackId] = useState(DEFAULT_MENU_BG_PACK);
  // Live slider values (label/thumb) vs. committed values (drive the preview
  // iframe). Commit on release so dragging doesn't reload the iframe per step.
  const [op, setOp] = useState(16);
  const [fs, setFs] = useState(100);
  const [committed, setCommitted] = useState({ op: 16, fs: 100 });
  const commit = () => setCommitted({ op, fs });

  if (!isOpen) return null;

  const qs = (o: number, f: number) =>
    `scheme=${schemeId}&layout=${layoutId}&pack=${packId}&op=${o}&fs=${f}`;
  const previewSrc = `/menu-pdf?${qs(committed.op, committed.fs)}&embed=1`;
  const openPrintable = () =>
    window.open(`/menu-pdf?${qs(op, fs)}`, "_blank", "noopener");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-fizz bg-ink shadow-lg">
        <div className="flex items-start justify-between border-b border-ink-line p-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Printable menu
            </h2>
            <p className="mt-1 text-sm text-steam">
              Pick a style, preview it, then print or save as PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-steam hover:text-fizz"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 sm:grid-cols-[260px_1fr]">
          {/* Pickers */}
          <div className="overflow-y-auto border-b border-ink-line p-4 sm:border-b-0 sm:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Color scheme
            </p>
            <div className="flex flex-col gap-2">
              {MENU_COLOR_SCHEMES.map((s) => {
                const active = s.id === schemeId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSchemeId(s.id)}
                    aria-pressed={active}
                    className={`flex items-start gap-3 rounded-fizz border p-3 text-left transition-colors ${
                      active
                        ? "border-fizz bg-fizz/10"
                        : "border-ink-line hover:border-fizz/50"
                    }`}
                  >
                    <span
                      className="mt-0.5 h-9 w-9 shrink-0 rounded-fizz border border-ink-line"
                      style={{ background: s.bg }}
                    >
                      <span
                        className="block h-full w-full rounded-fizz"
                        style={{
                          background: `linear-gradient(135deg, ${s.bg} 55%, ${s.accent} 55%)`,
                        }}
                      />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold ${
                          active ? "text-fizz" : "text-cream"
                        }`}
                      >
                        {s.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-steam">
                        {s.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Layout
            </p>
            <div className="flex flex-col gap-2">
              {MENU_LAYOUTS.map((l) => {
                const active = l.id === layoutId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayoutId(l.id)}
                    aria-pressed={active}
                    className={`rounded-fizz border p-3 text-left transition-colors ${
                      active
                        ? "border-fizz bg-fizz/10"
                        : "border-ink-line hover:border-fizz/50"
                    }`}
                  >
                    <span
                      className={`block text-sm font-semibold ${
                        active ? "text-fizz" : "text-cream"
                      }`}
                    >
                      {l.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-steam">
                      {l.blurb}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Background
            </p>
            <div className="flex flex-col gap-2">
              {MENU_BG_PACKS.map((p) => {
                const active = p.id === packId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackId(p.id)}
                    aria-pressed={active}
                    className={`rounded-fizz border p-3 text-left transition-colors ${
                      active
                        ? "border-fizz bg-fizz/10"
                        : "border-ink-line hover:border-fizz/50"
                    }`}
                  >
                    <span
                      className={`block text-sm font-semibold ${
                        active ? "text-fizz" : "text-cream"
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-steam">
                      {p.blurb}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Menu font size · {fs}%
            </p>
            <input
              type="range"
              min={80}
              max={140}
              step={5}
              value={fs}
              onChange={(e) => setFs(Number(e.target.value))}
              onMouseUp={commit}
              onTouchEnd={commit}
              onKeyUp={commit}
              className="w-full accent-[#C6F432]"
              aria-label="Menu font size"
            />

            {packId !== "none" && (
              <>
                <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                  Background opacity · {op}%
                </p>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={2}
                  value={op}
                  onChange={(e) => setOp(Number(e.target.value))}
                  onMouseUp={commit}
                  onTouchEnd={commit}
                  onKeyUp={commit}
                  className="w-full accent-[#C6F432]"
                  aria-label="Background opacity"
                />
              </>
            )}
          </div>

          {/* Live preview */}
          <div className="min-h-0 overflow-hidden bg-[#4a4a4a] p-4">
            <iframe
              key={`${schemeId}-${layoutId}-${packId}-${committed.op}-${committed.fs}`}
              src={previewSrc}
              title="Menu preview"
              className="h-[60vh] w-full rounded-fizz border border-ink-line bg-white sm:h-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-ink-line p-6">
          <button
            type="button"
            onClick={openPrintable}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
          >
            Open &amp; print →
          </button>
          <p className="text-sm text-steam">
            Opens full-screen — use your browser’s “Save as PDF”.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
