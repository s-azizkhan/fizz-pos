"use client";

import { useRef, useState } from "react";
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

type Combo = {
  scheme: string;
  layout: string;
  pack: string;
  op: number;
  fs: number;
};

// Curated one-tap combos — the fast path. Mixing your own is still one row away.
const PRESETS: { name: string; combo: Combo }[] = [
  { name: "Fizz Classic", combo: { scheme: "fizz", layout: "modern", pack: "bubbles", op: 14, fs: 100 } },
  { name: "Diner Cards", combo: { scheme: "diner", layout: "cards", pack: "cafe", op: 12, fs: 100 } },
  { name: "Neon Receipt", combo: { scheme: "vapor", layout: "receipt", pack: "none", op: 0, fs: 95 } },
  { name: "Fine Dining", combo: { scheme: "cream", layout: "elegant", pack: "none", op: 0, fs: 105 } },
  { name: "Street Poster", combo: { scheme: "punch", layout: "poster", pack: "cafe", op: 18, fs: 100 } },
  { name: "Chalk Board", combo: { scheme: "chalk", layout: "bistro", pack: "brew", op: 16, fs: 100 } },
  { name: "Sepia Press", combo: { scheme: "sepia", layout: "boutique", pack: "bakery", op: 14, fs: 100 } },
];

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

export default function ExportMenuPdfModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [scheme, setScheme] = useState(DEFAULT_MENU_COLOR_SCHEME);
  const [layout, setLayout] = useState(DEFAULT_MENU_LAYOUT);
  const [pack, setPack] = useState(DEFAULT_MENU_BG_PACK);
  const [op, setOp] = useState(14);
  const [fs, setFs] = useState(100);
  // Committed slider values drive the preview iframe (commit on release so a
  // drag doesn't reload it per step). Scheme/layout/pack reload immediately.
  const [cOp, setCOp] = useState(14);
  const [cFs, setCFs] = useState(100);

  // Bump this to force a fresh preview src even when slider commit lands on the
  // same value (e.g. after a preset/shuffle).
  const [rev, setRev] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const qs = (o: number, f: number) =>
    `scheme=${scheme}&layout=${layout}&pack=${pack}&op=${o}&fs=${f}`;
  const previewSrc = `/menu-pdf?${qs(cOp, cFs)}&embed=1`;

  const applyCombo = (c: Combo) => {
    setScheme(c.scheme);
    setLayout(c.layout);
    setPack(c.pack);
    setOp(c.op);
    setFs(c.fs);
    setCOp(c.op);
    setCFs(c.fs);
    setRev((r) => r + 1);
  };

  const shuffle = () => {
    // Click-time randomness (not render) — SSR stays deterministic.
    const r = () => Math.floor(Math.random() * 1e6);
    applyCombo({
      scheme: pick(MENU_COLOR_SCHEMES, r()).id,
      layout: pick(MENU_LAYOUTS, r()).id,
      pack: pick(MENU_BG_PACKS, r()).id,
      op: 8 + (r() % 5) * 6,
      fs: 90 + (r() % 5) * 5,
    });
  };

  const commitOp = () => setCOp(op);
  const commitFs = () => setCFs(fs);

  const printNow = () => iframeRef.current?.contentWindow?.print();
  const openFull = () =>
    window.open(`/menu-pdf?${qs(op, fs)}`, "_blank", "noopener");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-fizz border border-ink-line bg-ink shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-ink-line px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Printable menu
            </h2>
            <p className="mt-0.5 text-sm text-steam">
              Tap a preset, or mix your own — then print.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shuffle}
              className="rounded-fizz border border-ink-line px-3 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
              title="Random combo"
            >
              🎲 Shuffle
            </button>
            <button
              onClick={onClose}
              className="text-2xl leading-none text-steam hover:text-fizz"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 sm:grid-cols-[300px_1fr]">
          {/* Controls */}
          <div className="flex flex-col gap-5 overflow-y-auto border-b border-ink-line p-5 sm:border-b-0 sm:border-r">
            {/* Presets */}
            <Section label="Presets">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const active =
                    p.combo.scheme === scheme &&
                    p.combo.layout === layout &&
                    p.combo.pack === pack;
                  return (
                    <Chip
                      key={p.name}
                      active={active}
                      onClick={() => applyCombo(p.combo)}
                    >
                      {p.name}
                    </Chip>
                  );
                })}
              </div>
            </Section>

            {/* Color scheme — visual swatches */}
            <Section label="Color">
              <div className="flex flex-wrap gap-2">
                {MENU_COLOR_SCHEMES.map((s) => (
                  <Chip
                    key={s.id}
                    active={s.id === scheme}
                    onClick={() => setScheme(s.id)}
                    title={s.blurb}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-ink-line"
                      style={{
                        background: `linear-gradient(135deg, ${s.bg} 50%, ${s.accent} 50%)`,
                      }}
                    />
                    {s.name}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Layout */}
            <Section label="Layout">
              <div className="flex flex-wrap gap-2">
                {MENU_LAYOUTS.map((l) => (
                  <Chip
                    key={l.id}
                    active={l.id === layout}
                    onClick={() => setLayout(l.id)}
                    title={l.blurb}
                  >
                    {l.name}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Background */}
            <Section label="Background">
              <div className="flex flex-wrap gap-2">
                {MENU_BG_PACKS.map((p) => (
                  <Chip
                    key={p.id}
                    active={p.id === pack}
                    onClick={() => setPack(p.id)}
                    title={p.blurb}
                  >
                    {p.name}
                  </Chip>
                ))}
              </div>
            </Section>

            {/* Fine-tune */}
            <Section label="Fine-tune">
              <Slider
                label="Font size"
                value={fs}
                min={80}
                max={140}
                step={5}
                suffix="%"
                onChange={setFs}
                onCommit={commitFs}
              />
              {pack !== "none" && (
                <Slider
                  label="Background"
                  value={op}
                  min={0}
                  max={60}
                  step={2}
                  suffix="%"
                  onChange={setOp}
                  onCommit={commitOp}
                />
              )}
            </Section>
          </div>

          {/* Live preview */}
          <div className="min-h-0 overflow-hidden bg-[#4a4a4a] p-4">
            <iframe
              ref={iframeRef}
              key={`${scheme}-${layout}-${pack}-${cOp}-${cFs}-${rev}`}
              src={previewSrc}
              title="Menu preview"
              className="h-[58vh] w-full rounded-fizz border border-ink-line bg-white sm:h-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-3 border-t border-ink-line px-6 py-4">
          <button
            type="button"
            onClick={printNow}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
          >
            Print / Save PDF
          </button>
          <button
            type="button"
            onClick={openFull}
            className="rounded-fizz border border-ink-line px-5 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Open full ↗
          </button>
          <p className="hidden text-sm text-steam sm:block">
            Print uses your browser’s “Save as PDF”.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-fizz border border-ink-line px-5 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-fizz bg-fizz/10 text-fizz"
          : "border-ink-line text-cream hover:border-fizz/50"
      }`}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm text-cream">
        {label}
        <span className="rounded-full bg-ink-soft px-2 py-0.5 text-xs font-semibold text-fizz">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        onKeyUp={onCommit}
        className="w-full accent-[#C6F432]"
        aria-label={label}
      />
    </label>
  );
}
