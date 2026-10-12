"use client";

import { useState } from "react";

// Filters the server-rendered menu in place: items carry `data-q` (lowercased
// searchable text) and sections carry `data-cat`. Toggling `hidden` on the DOM
// beats lifting the whole menu into a client component for one text box.
export default function MenuSearch() {
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
      {none && <p className="mt-4 text-center text-[0.9em] text-[var(--m-muted)]">Nothing matches “{q.trim()}”.</p>}
    </div>
  );
}
