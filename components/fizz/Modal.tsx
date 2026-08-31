"use client";

import { useEffect } from "react";
import { useSwipeDismiss } from "@/lib/use-swipe-dismiss";

// Shared overlay dialog: closes on Escape, backdrop click, or the ✕ button,
// and locks body scroll while open. Brand-styled per Fizz spec.
export default function Modal({
  open,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const swipe = useSwipeDismiss(onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Mobile: a slide-up sheet pinned to the bottom. Desktop: a centred dialog.
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-ink/80 backdrop-blur-sm sm:items-start sm:p-4 sm:py-10"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        {...swipe.handlers}
        style={swipe.style}
        className={`fizz-sheet relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] sm:max-h-none sm:animate-none sm:overflow-visible sm:pb-0 ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle — the visual promise that the sheet can be dragged. */}
        <div className="flex h-0 justify-center sm:hidden">
          <span className="mt-2 h-1.5 w-10 rounded-full bg-cream/25" />
        </div>
        {/* Zero-height sticky row keeps ✕ reachable while the sheet scrolls. */}
        <div className="sticky top-0 z-10 h-0 text-right">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mr-4 mt-4 rounded-full border border-ink-line bg-ink-soft px-3 py-1 text-sm text-steam transition-colors hover:border-fizz hover:text-fizz"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
