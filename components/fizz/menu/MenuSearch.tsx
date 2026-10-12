"use client";

import { useState } from "react";

// Filters the server-rendered menu in place: items carry `data-q` (lowercased
// searchable text) and sections carry `data-cat`. Toggling `hidden` on the DOM
// beats lifting the whole menu into a client component for one text box.
export default function MenuSearch({
  storeName,
  categories,
  whatsapp,
  phone,
  accent,
}: {
  storeName: string;
  categories: string[];
  whatsapp?: string | null;
  phone?: string | null;
  accent: string;
}) {
  const [q, setQ] = useState("");
  const [none, setNone] = useState(false);

  const apply = (value: string) => {
    setQ(value);
    const needle = value.trim().toLowerCase();
    let any = false;
    document.querySelectorAll<HTMLElement>("[data-cat]").forEach((cat) => {
      let hits = 0;
      cat.querySelectorAll<HTMLElement>("[data-q]").forEach((it) => {
        const show = !needle || it.dataset.q!.includes(needle);
        it.hidden = !show;
        if (show) hits++;
      });
      cat.hidden = hits === 0;
      if (hits) any = true;
    });
    setNone(!any);
  };

  // Empty search is the moment a guest is closest to leaving: keep them on the
  // menu (category chips) or route the want to the café (WhatsApp / call).
  const term = q.trim();
  const ask = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${storeName}! Do you have "${term}"?`)}`
    : phone
      ? `tel:${phone.replace(/[^\d+]/g, "")}`
      : null;

  return (
    <div className="sticky top-0 z-30 -mx-6 mt-6 bg-[var(--m-bg)] px-6 py-3">
      <input
        type="search"
        value={q}
        onChange={(e) => apply(e.target.value)}
        placeholder="Search the menu"
        aria-label="Search the menu"
        className="w-full rounded-[var(--m-radius)] border border-[var(--m-line)] bg-[var(--m-surface)] px-4 py-3 text-[0.95em] text-[var(--m-text)] outline-none placeholder:text-[var(--m-muted)] focus:border-[color:var(--m-accent)]"
      />
      {none && (
        <div className="mt-6 text-center">
          <p className="text-[1.05em] font-semibold">
            No “{term}” on our menu — yet.
          </p>
          <p className="mt-1 text-[0.9em] text-[var(--m-muted)]">
            Try something from {storeName}&rsquo;s kitchen:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => apply(c)}
                className="rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] px-4 py-2 text-[0.85em] font-medium"
              >
                {c}
              </button>
            ))}
          </div>
          {ask && (
            <a
              href={ask}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-[var(--m-radius)] px-5 py-3 text-[0.9em] font-semibold text-[var(--m-bg)]"
              style={{ background: accent }}
            >
              {whatsapp ? "Ask us on WhatsApp" : "Call to ask"}
            </a>
          )}
          <div>
            <button
              type="button"
              onClick={() => apply("")}
              className="mt-4 text-[0.85em] text-[var(--m-muted)] underline underline-offset-4"
            >
              Clear search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
