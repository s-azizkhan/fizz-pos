"use client";

import { useState } from "react";

// Native share sheet where it exists (every phone), copy-the-link elsewhere.
export default function ShareButton({
  title,
  text,
  path,
  accent,
  glass,
}: {
  title: string;
  text: string;
  /** Path to share; made absolute from the page's origin at tap time. */
  path: string;
  accent: string;
  /** On the poster layout the button sits on a photo. */
  glass?: boolean;
}) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = `${location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* user dismissed the sheet */
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this café"
      className={`inline-flex touch-manipulation items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold backdrop-blur-sm transition-transform active:scale-95 ${
        glass ? "border-white/25 bg-black/35 text-white" : "border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-text)]"
      }`}
      style={done ? { borderColor: accent, color: accent } : undefined}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {done ? "Link copied" : "Share"}
    </button>
  );
}
