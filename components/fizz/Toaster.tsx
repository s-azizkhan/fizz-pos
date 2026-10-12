"use client";

import { useToastStore, type ToastType } from "@/lib/store/toast";
import { CheckIcon, AlertIcon, InfoIcon, CloseIcon } from "@/components/fizz/dashboard/icons";

// Accent bar + glyph per toast type. Lime = good, red = error, cyan = info.
const TONE: Record<ToastType, { bar: string; Glyph: typeof CheckIcon; glyphCls: string }> = {
  success: { bar: "bg-fizz", Glyph: CheckIcon, glyphCls: "text-fizz" },
  error: { bar: "bg-[#E2655A]", Glyph: AlertIcon, glyphCls: "text-[#E2655A]" },
  info: { bar: "bg-bubble", Glyph: InfoIcon, glyphCls: "text-bubble" },
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[100] sm:top-4 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
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
            <tone.Glyph className={`mt-0.5 h-5 w-5 shrink-0 ${tone.glyphCls}`} />
            <p className="flex-1 py-0.5 text-sm text-cream">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-steam transition-colors hover:text-cream"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
