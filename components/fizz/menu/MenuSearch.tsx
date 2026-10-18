"use client";

import { useEffect, useRef, useState } from "react";

// Sticky menu toolbar: search, veg / non-veg filter, category chips that
// scroll-spy and jump. Filters the server-rendered menu in place: items carry
// `data-q` (lowercased searchable text) + `data-diet`, sections carry
// `data-cat={id}` (category sections are folded <details>). Toggling `hidden` on the DOM beats lifting the whole menu
// into a client component for a toolbar.
type Diet = "all" | "veg" | "nonveg";

export default function MenuSearch({
  storeName,
  categories,
  whatsapp,
  phone,
  accent,
  hasDiet,
}: {
  storeName: string;
  categories: { id: string; name: string; icon: string | null }[];
  whatsapp?: string | null;
  phone?: string | null;
  accent: string;
  /** Any item tagged veg/non-veg? Otherwise the filter stays hidden. */
  hasDiet: boolean;
}) {
  const [q, setQ] = useState("");
  const [diet, setDiet] = useState<Diet>("all");
  const [none, setNone] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const chips = useRef<HTMLDivElement>(null);

  const apply = (value: string, d: Diet = diet) => {
    setQ(value);
    setDiet(d);
    const needle = value.trim().toLowerCase();
    let any = false;
    document.querySelectorAll<HTMLElement>("[data-cat]").forEach((cat) => {
      let hits = 0;
      cat.querySelectorAll<HTMLElement>("[data-q]").forEach((it) => {
        const show = (!needle || it.dataset.q!.includes(needle)) && (d === "all" || it.dataset.diet === d);
        it.hidden = !show;
        if (show) hits++;
      });
      cat.hidden = hits === 0;
      // Categories are folded <details>: filtering unfolds the hits, clearing folds back.
      if (cat instanceof HTMLDetailsElement) cat.open = (!!needle || d !== "all") && hits > 0;
      if (hits) any = true;
    });
    setNone(!any);
  };

  // Scroll-spy: the section whose top is just under the sticky bar is active.
  // The active chip scrolls into view in the chip row.
  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-cat]"));
    if (!secs.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive((vis[0].target as HTMLElement).dataset.cat!);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!active) return;
    chips.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const jump = (id: string) => {
    if (q || diet !== "all") apply("", "all");
    const el = document.querySelector<HTMLElement>(`[data-cat="${id}"]`);
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    const y = el.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Empty search is the moment a guest is closest to leaving: keep them on the
  // menu (category chips) or route the want to the store (WhatsApp / call).
  const term = q.trim();
  const ask = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${storeName}! Do you have "${term}"?`)}`
    : phone
      ? `tel:${phone.replace(/[^\d+]/g, "")}`
      : null;

  const chip = (on: boolean) =>
    `shrink-0 touch-manipulation rounded-full border px-3.5 py-2 text-[0.82em] font-semibold leading-none transition-colors ${
      on ? "" : "border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-text)]"
    }`;
  const chipOn = { backgroundColor: accent, borderColor: accent, color: "var(--m-bg)" };

  return (
    <div className="sticky top-0 z-30 -mx-6 mt-5 border-b border-[var(--m-line)] bg-[var(--m-bg)]/90 px-6 pb-3 pt-3 backdrop-blur-md">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--m-muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => apply(e.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="w-full rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] py-2.5 pl-10 pr-4 text-[0.95em] text-[var(--m-text)] outline-none placeholder:text-[var(--m-muted)] focus:border-[color:var(--m-accent)]"
          />
        </div>
        {hasDiet && (
          <div className="flex shrink-0 gap-1 rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] p-1" role="group" aria-label="Diet filter">
            {(["all", "veg", "nonveg"] as Diet[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => apply(q, d)}
                aria-pressed={diet === d}
                className="touch-manipulation rounded-full px-2.5 py-1.5 text-[0.78em] font-bold leading-none transition-colors"
                style={
                  diet === d
                    ? { backgroundColor: d === "veg" ? "#2E7D32" : d === "nonveg" ? "#B3261E" : accent, color: "#fff" }
                    : { color: "var(--m-muted)" }
                }
              >
                {d === "all" ? "All" : d === "veg" ? "Veg" : "Non-veg"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={chips} className="-mx-6 mt-3 flex gap-2 overflow-x-auto px-6 no-scrollbar">
        {categories.map((c) => {
          const on = active === c.id && !q;
          return (
            <button key={c.id} type="button" data-chip={c.id} onClick={() => jump(c.id)} className={chip(on)} style={on ? chipOn : undefined}>
              {c.name}
            </button>
          );
        })}
      </div>
      {none && (
        <div className="mt-6 text-center">
          <p className="text-[1.05em] font-semibold">
            {term ? `No “${term}” on our menu — yet.` : "Nothing matches that filter."}
          </p>
          <p className="mt-1 text-[0.9em] text-[var(--m-muted)]">
            Try something from {storeName}&rsquo;s kitchen:
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => jump(c.id)}
                className="rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] px-4 py-2 text-[0.85em] font-medium"
              >
                {c.name}
              </button>
            ))}
          </div>
          {ask && term && (
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
              onClick={() => apply("", "all")}
              className="mt-4 text-[0.85em] text-[var(--m-muted)] underline underline-offset-4"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
