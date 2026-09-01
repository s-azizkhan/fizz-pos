"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chip, ControlSection, ValueSlider } from "@/components/fizz/ui/controls";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

// Print frames. Colors are literal because this leaves the app as a PNG the
// café prints — brand tokens don't exist on paper, and scanners need the QR
// itself dark-on-light whatever the frame does.
const FRAMES = [
  {
    key: "cream",
    name: "Cream classic",
    bg: "#F4F1E9",
    ink: "#0E1116",
    muted: "#6B7280",
    accent: "#0E1116",
    dark: "#0E1116",
    light: "#F4F1E9",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "ink",
    name: "Ink bold",
    bg: "#0E1116",
    ink: "#F4F1E9",
    muted: "#8A93A1",
    accent: "#C6F432",
    dark: "#0E1116",
    light: "#F4F1E9",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "lime",
    name: "Lime tent",
    bg: "#C6F432",
    ink: "#0E1116",
    muted: "#3F4A2A",
    accent: "#0E1116",
    dark: "#0E1116",
    light: "#FFFFFF",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "minimal",
    name: "Minimal",
    bg: "#FFFFFF",
    ink: "#111111",
    muted: "#8A8A8A",
    accent: "#111111",
    dark: "#111111",
    light: "#FFFFFF",
    font: "'Inter', system-ui, sans-serif",
    radius: 0,
  },
  {
    key: "espresso",
    name: "Espresso",
    bg: "#241A15",
    ink: "#F1E7DC",
    muted: "#A8917E",
    accent: "#D9A566",
    dark: "#241A15",
    light: "#F1E7DC",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "sage",
    name: "Sage",
    bg: "#DDE5D6",
    ink: "#1E2A20",
    muted: "#5C6B5C",
    accent: "#2F5D3A",
    dark: "#1E2A20",
    light: "#FFFFFF",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "blush",
    name: "Blush",
    bg: "#F7E7E3",
    ink: "#2B1E1C",
    muted: "#8A6B66",
    accent: "#C2564B",
    dark: "#2B1E1C",
    light: "#FFFFFF",
    font: "'Inter', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "midnight",
    name: "Midnight",
    bg: "#101A2E",
    ink: "#E6ECF7",
    muted: "#8394B0",
    accent: "#38E1D6",
    dark: "#101A2E",
    light: "#E6ECF7",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "kraft",
    name: "Kraft",
    bg: "#D9C4A3",
    ink: "#3A2B1B",
    muted: "#7B6549",
    accent: "#3A2B1B",
    dark: "#3A2B1B",
    light: "#F3E7D3",
    font: "'Space Grotesk', system-ui, sans-serif",
    radius: 28,
  },
  {
    key: "mono",
    name: "Mono invert",
    bg: "#111111",
    ink: "#FFFFFF",
    muted: "#9A9A9A",
    accent: "#FFFFFF",
    dark: "#111111",
    light: "#FFFFFF",
    font: "'Inter', system-ui, sans-serif",
    radius: 0,
  },
] as const;

// Backdrops are plain CSS gradients so html-to-image exports them as-is —
// no images to inline, no fonts to wait on. `c` is the frame's ink color at
// low alpha, mixed in with color-mix so each backdrop reads on any frame.
const BACKDROPS = [
  { key: "none", name: "Plain", css: () => "" },
  {
    key: "bubbles",
    name: "Bubbles",
    css: (c: string) =>
      [
        `radial-gradient(circle at 14% 18%, ${c} 0 26px, transparent 27px)`,
        `radial-gradient(circle at 84% 12%, ${c} 0 16px, transparent 17px)`,
        `radial-gradient(circle at 90% 74%, ${c} 0 40px, transparent 41px)`,
        `radial-gradient(circle at 8% 86%, ${c} 0 32px, transparent 33px)`,
        `radial-gradient(circle at 62% 94%, ${c} 0 12px, transparent 13px)`,
      ].join(", "),
  },
  {
    key: "rings",
    name: "Rings",
    css: (c: string) =>
      `repeating-radial-gradient(circle at 50% 46%, ${c} 0 2px, transparent 2px 26px)`,
  },
  {
    key: "grid",
    name: "Grid",
    css: (c: string) =>
      `linear-gradient(${c} 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / 24px 24px`,
  },
  {
    key: "wash",
    name: "Wash",
    css: (c: string) =>
      `radial-gradient(120% 90% at 50% 0%, ${c} 0%, transparent 60%)`,
  },
  {
    key: "dots",
    name: "Dots",
    css: (c: string) => `radial-gradient(${c} 2px, transparent 2px) 0 0 / 20px 20px`,
  },
  {
    key: "stripes",
    name: "Stripes",
    css: (c: string) =>
      `repeating-linear-gradient(45deg, ${c} 0 10px, transparent 10px 24px)`,
  },
  {
    key: "arch",
    name: "Arch",
    css: (c: string) =>
      `radial-gradient(70% 46% at 50% 42%, transparent 0 58%, ${c} 58% 61%, transparent 61%)`,
  },
  {
    key: "corners",
    name: "Corners",
    css: (c: string) =>
      [
        `radial-gradient(circle at 0% 0%, ${c} 0 92px, transparent 93px)`,
        `radial-gradient(circle at 100% 100%, ${c} 0 92px, transparent 93px)`,
      ].join(", "),
  },
  {
    key: "steam",
    name: "Steam",
    css: (c: string) =>
      [
        `repeating-radial-gradient(circle at 20% 130%, ${c} 0 3px, transparent 3px 34px)`,
        `repeating-radial-gradient(circle at 80% -30%, ${c} 0 3px, transparent 3px 34px)`,
      ].join(", "),
  },
  {
    key: "confetti",
    name: "Confetti",
    css: (c: string) =>
      [
        `radial-gradient(circle at 12% 30%, ${c} 0 5px, transparent 6px)`,
        `radial-gradient(circle at 30% 8%, ${c} 0 8px, transparent 9px)`,
        `radial-gradient(circle at 70% 22%, ${c} 0 4px, transparent 5px)`,
        `radial-gradient(circle at 88% 48%, ${c} 0 7px, transparent 8px)`,
        `radial-gradient(circle at 22% 66%, ${c} 0 6px, transparent 7px)`,
        `radial-gradient(circle at 78% 82%, ${c} 0 5px, transparent 6px)`,
        `radial-gradient(circle at 46% 90%, ${c} 0 8px, transparent 9px)`,
      ].join(", "),
  },
  {
    key: "halftone",
    name: "Halftone",
    css: (c: string) =>
      `radial-gradient(${c} 3px, transparent 4px) 0 0 / 18px 18px, radial-gradient(${c} 1.5px, transparent 2px) 9px 9px / 18px 18px`,
  },
  {
    key: "beam",
    name: "Beam",
    css: (c: string) =>
      `linear-gradient(160deg, transparent 0 34%, ${c} 34% 46%, transparent 46% 58%, ${c} 58% 63%, transparent 63%)`,
  },
  {
    key: "frame",
    name: "Border",
    css: (c: string) =>
      [
        `linear-gradient(${c} 0 0) 0 0 / 100% 10px no-repeat`,
        `linear-gradient(${c} 0 0) 0 100% / 100% 10px no-repeat`,
        `linear-gradient(${c} 0 0) 0 0 / 10px 100% no-repeat`,
        `linear-gradient(${c} 0 0) 100% 0 / 10px 100% no-repeat`,
      ].join(", "),
  },
  {
    key: "sunburst",
    name: "Sunburst",
    css: (c: string) =>
      `repeating-conic-gradient(from 0deg at 50% 44%, ${c} 0deg 6deg, transparent 6deg 18deg)`,
  },
] as const;

// WCAG relative luminance — a QR under ~3:1 against its tile stops scanning
// reliably, so a picked color that kills the code gets called out.
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return [16, 8, 0]
    .map((sh) => ((n >> sh) & 255) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export default function MenuQrModal({
  storeName,
  url,
  published,
  slug,
  isOpen,
  onClose,
}: {
  storeName: string;
  url: string;
  published: boolean;
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [frameKey, setFrameKey] = useState<string>(FRAMES[0].key);
  const [headline, setHeadline] = useState("Scan for our menu");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [radius, setRadius] = useState(28);
  const [qrSize, setQrSize] = useState(220);
  const [backdropKey, setBackdropKey] = useState<string>("bubbles");
  // Colors start from the frame and then belong to the user — picking a new
  // frame reseeds them, editing them wins until then.
  const [bg, setBg] = useState<string>(FRAMES[0].bg);
  const [qrDark, setQrDark] = useState<string>(FRAMES[0].dark);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const frame = FRAMES.find((f) => f.key === frameKey) ?? FRAMES[0];
  const backdrop = BACKDROPS.find((b) => b.key === backdropKey) ?? BACKDROPS[0];
  const scannable = contrast(qrDark, frame.light) >= 3;
  const backdropCss = backdrop.css(`color-mix(in srgb, ${frame.ink} 10%, transparent)`);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    QRCode.toDataURL(url, {
      width: 1200, // oversized source so the 4x print export stays sharp
      margin: 1,
      errorCorrectionLevel: "H", // survives a coffee ring on a table tent
      color: { dark: qrDark, light: frame.light },
    })
      .then((d) => live && setQr(d))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [isOpen, url, qrDark, frame.light]);

  async function download() {
    const node = cardRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const png = await toPng(node, {
        pixelRatio: 4, // ~1440x1920 — enough for A5/A6 print
        backgroundColor: bg,
        cacheBust: true,
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
      const a = document.createElement("a");
      a.href = png;
      a.download = `${slug || "menu"}-qr-${frame.key}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  // Escape closes, and the body stays put so the page behind doesn't scroll
  // under the dialog — same contract as the shared Modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const applyFrame = useCallback((f: (typeof FRAMES)[number]) => {
    setFrameKey(f.key);
    setBg(f.bg);
    setQrDark(f.dark);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Menu QR code"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-dvh w-full flex-col overflow-hidden border-ink-line bg-ink sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-fizz sm:border sm:shadow-lg"
      >
        {/* Header — stays put while the controls scroll. */}
        <div className="flex items-start justify-between gap-4 border-b border-ink-line px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Menu QR code
            </h2>
            <p className="mt-0.5 truncate text-sm text-steam">
              Style it, download the PNG, print it for the table.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-ink-line px-3 py-1 text-sm text-steam transition-colors hover:border-fizz hover:text-fizz"
          >
            ✕
          </button>
        </div>

        {/* Body — preview left, controls right; each scrolls on its own. */}
        <div className="grid min-h-0 flex-1 sm:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 items-start justify-center overflow-y-auto border-b border-ink-line bg-ink-soft/40 p-5 sm:border-b-0 sm:border-r sm:items-center">
            {/* This exact node is what gets exported. */}
            <div
              ref={cardRef}
              style={{
                width: 360,
                height: 480,
                background: backdropCss ? `${backdropCss}, ${bg}` : bg,
                color: frame.ink,
                fontFamily: frame.font,
                borderRadius: radius,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {storeName}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: frame.muted,
                  }}
                >
                  {headline}
                </div>
              </div>

              <div
                style={{
                  background: frame.light,
                  padding: 14,
                  borderRadius: Math.max(radius - 12, 0),
                  lineHeight: 0,
                }}
              >
                {qr ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- data: URL */
                  <img src={qr} alt="Menu QR code" width={qrSize} height={qrSize} />
                ) : (
                  <div style={{ width: qrSize, height: qrSize }} />
                )}
              </div>

              <div style={{ fontSize: 11, color: frame.muted, wordBreak: "break-all" }}>
                {url.replace(/^https?:\/\//, "")}
                <div
                  className="font-wordmark"
                  style={{ marginTop: 8, fontSize: 12, color: frame.accent, fontWeight: 700 }}
                >
                  Fizz ●
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5">
            {!published && (
              <p className="rounded-fizz border border-[#E2655A]/50 bg-[#E2655A]/10 px-4 py-3 text-sm text-[#E2655A]">
                Menu isn&apos;t published yet — this QR 404s until you publish it.
              </p>
            )}
            {!scannable && (
              <p className="rounded-fizz border border-[#E2655A]/50 bg-[#E2655A]/10 px-4 py-3 text-sm text-[#E2655A]">
                QR color is too faint against its tile — phones will struggle to scan it.
              </p>
            )}

            <ControlSection label="Headline">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value.slice(0, 40))}
                placeholder="Scan for our menu"
                className="w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
              />
            </ControlSection>

            <ControlSection label="Frame">
              <div className="grid grid-cols-2 gap-2.5">
                {FRAMES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={f.key === frameKey}
                    onClick={() => applyFrame(f)}
                    className={`overflow-hidden rounded-fizz border text-left transition-transform hover:scale-[1.03] ${
                      f.key === frameKey ? "border-fizz ring-2 ring-fizz/40" : "border-ink-line"
                    }`}
                  >
                    <span className="grid h-12 place-items-center" style={{ background: f.bg }}>
                      <span className="h-6 w-6 rounded-[4px]" style={{ background: f.dark }} />
                    </span>
                    <span className="block bg-ink-soft px-2.5 py-1.5 text-[11px] font-semibold text-cream">
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            </ControlSection>

            <ControlSection label="Backdrop">
              <div className="flex flex-wrap gap-2">
                {BACKDROPS.map((b) => (
                  <Chip
                    key={b.key}
                    active={b.key === backdropKey}
                    onClick={() => setBackdropKey(b.key)}
                  >
                    {b.name}
                  </Chip>
                ))}
              </div>
            </ControlSection>

            <ControlSection label="Colors">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm text-cream">
                  Background
                  <input
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value.toUpperCase())}
                    className="h-10 w-full cursor-pointer rounded-fizz border border-ink-line bg-ink-soft"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm text-cream">
                  QR
                  <input
                    type="color"
                    value={qrDark}
                    onChange={(e) => setQrDark(e.target.value.toUpperCase())}
                    className="h-10 w-full cursor-pointer rounded-fizz border border-ink-line bg-ink-soft"
                  />
                </label>
              </div>
            </ControlSection>

            <ControlSection label="Shape">
              <ValueSlider label="Roundness" value={radius} min={0} max={64} step={1} suffix="px" onChange={setRadius} />
              <ValueSlider label="QR size" value={qrSize} min={140} max={280} step={4} suffix="px" onChange={setQrSize} />
            </ControlSection>
          </div>
        </div>

        {/* Sticky footer — the action never scrolls out of reach. */}
        <div className="flex flex-wrap items-center gap-3 border-t border-ink-line bg-ink px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            onClick={download}
            disabled={busy || !qr}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
          >
            {busy ? "Rendering…" : "Download PNG"}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-fizz border border-ink-line px-5 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            {copied ? "Copied ●" : "Copy link"}
          </button>
          <p className="hidden text-sm text-steam lg:block">1440 × 1920px — prints clean to A5.</p>
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
