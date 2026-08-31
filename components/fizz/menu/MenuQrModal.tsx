"use client";

import { useEffect, useRef, useState } from "react";
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
] as const;

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
  const cardRef = useRef<HTMLDivElement>(null);

  const frame = FRAMES.find((f) => f.key === frameKey) ?? FRAMES[0];

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    QRCode.toDataURL(url, {
      width: 1200, // oversized source so the 4x print export stays sharp
      margin: 1,
      errorCorrectionLevel: "H", // survives a coffee ring on a table tent
      color: { dark: frame.dark, light: frame.light },
    })
      .then((d) => live && setQr(d))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [isOpen, url, frame.dark, frame.light]);

  async function download() {
    const node = cardRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const png = await toPng(node, {
        pixelRatio: 4, // ~1440x1920 — enough for A5/A6 print
        backgroundColor: frame.bg,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-fizz bg-ink p-8 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Menu QR code</h2>
            <p className="mt-1 text-sm text-steam">
              Pick a frame, download the PNG, print it for the table.
            </p>
          </div>
          <button onClick={onClose} className="text-2xl text-steam hover:text-fizz" aria-label="Close modal">
            ✕
          </button>
        </div>

        {!published && (
          <p className="mt-5 rounded-fizz border border-[#E2655A]/50 bg-[#E2655A]/10 px-4 py-3 text-sm text-[#E2655A]">
            Your menu isn&apos;t published yet — this QR will 404 until you publish it.
          </p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_260px]">
          {/* Preview — this exact node is what gets exported. */}
          <div className="flex justify-center">
            <div
              ref={cardRef}
              style={{
                width: 360,
                height: 480,
                background: frame.bg,
                color: frame.ink,
                fontFamily: frame.font,
                borderRadius: frame.radius,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{storeName}</div>
                <div style={{ marginTop: 6, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: frame.muted }}>
                  {headline}
                </div>
              </div>

              <div
                style={{
                  background: frame.light,
                  padding: 14,
                  borderRadius: Math.max(frame.radius - 12, 0),
                  lineHeight: 0,
                }}
              >
                {qr ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- data: URL */
                  <img src={qr} alt="Menu QR code" width={220} height={220} />
                ) : (
                  <div style={{ width: 220, height: 220 }} />
                )}
              </div>

              <div style={{ fontSize: 11, color: frame.muted, wordBreak: "break-all" }}>
                {url.replace(/^https?:\/\//, "")}
                <div style={{ marginTop: 8, fontSize: 11, color: frame.accent, fontWeight: 600 }}>
                  Fizz ●
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Headline</span>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value.slice(0, 40))}
                className="w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Frame</span>
              <div className="grid grid-cols-2 gap-3">
                {FRAMES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={f.key === frameKey}
                    onClick={() => setFrameKey(f.key)}
                    className={`overflow-hidden rounded-fizz border text-left transition-transform hover:scale-[1.03] ${
                      f.key === frameKey ? "border-fizz ring-2 ring-fizz/40" : "border-ink-line"
                    }`}
                  >
                    <span className="grid h-14 place-items-center" style={{ background: f.bg }}>
                      <span className="h-7 w-7 rounded-[4px]" style={{ background: f.dark }} />
                    </span>
                    <span className="block bg-ink-soft px-3 py-2 text-xs font-semibold text-cream">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={download}
              disabled={busy || !qr}
              className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
            >
              {busy ? "Rendering…" : "Download PNG"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
