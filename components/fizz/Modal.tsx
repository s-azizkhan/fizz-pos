"use client";

import { useEffect } from "react";

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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className={`relative w-full ${maxWidth}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full border border-ink-line bg-ink-soft px-3 py-1 text-sm text-steam transition-colors hover:border-fizz hover:text-fizz"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
