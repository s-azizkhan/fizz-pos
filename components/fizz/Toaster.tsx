"use client";

import { useToastStore, type ToastType } from "@/lib/store/toast";

// Accent bar + glyph per toast type. Lime = good, red = error, cyan = info.
const TONE: Record<ToastType, { bar: string; glyph: string; glyphCls: string }> = {
  success: { bar: "bg-fizz", glyph: "●", glyphCls: "text-fizz" },
  error: { bar: "bg-[#E2655A]", glyph: "✕", glyphCls: "text-[#E2655A]" },
  info: { bar: "bg-bubble", glyph: "●", glyphCls: "text-bubble" },
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const tone = TONE[t.type];
        return (
          <div
            key={t.id}
            className="fizz-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-fizz border border-ink-line bg-ink-soft/95 py-3 pl-0 pr-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            <span className={`h-auto w-1 self-stretch shrink-0 ${tone.bar}`} />
            <span className={`mt-0.5 text-sm font-bold ${tone.glyphCls}`}>
              {tone.glyph}
            </span>
            <p className="flex-1 py-0.5 text-sm text-cream">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-steam transition-colors hover:text-cream"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
