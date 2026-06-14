"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DOC_SECTIONS,
  QUICK_RECIPES,
  type DocBlock,
  type DocSection,
} from "@/lib/store/docs-content";

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="text-steam leading-relaxed">{block.text}</p>;
    case "steps":
      return (
        <ol className="space-y-2">
          {block.items.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink-line font-display text-xs text-fizz">
                {i + 1}
              </span>
              <span className="text-cream leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <dl className="grid gap-2 sm:grid-cols-[180px_1fr]">
          {block.items.map(([term, def], i) => (
            <div key={i} className="contents">
              <dt className="font-semibold text-cream">{term}</dt>
              <dd className="text-steam">{def}</dd>
            </div>
          ))}
        </dl>
      );
    case "keys":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {block.items.map(([k, action], i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-fizz border border-ink-line bg-ink px-3 py-2"
            >
              <span className="text-sm text-steam">{action}</span>
              <kbd className="shrink-0 rounded-md border border-ink-line bg-ink-soft px-2 py-0.5 font-display text-xs text-cream">
                {k}
              </kbd>
            </div>
          ))}
        </div>
      );
    case "tip":
      return (
        <div className="rounded-fizz border border-fizz/40 bg-fizz/[0.07] px-4 py-3 text-sm">
          <span className="font-semibold text-fizz">Tip · </span>
          <span className="text-cream">{block.text}</span>
        </div>
      );
  }
}

function Section({ section }: { section: DocSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {section.title}
        </h2>
        {section.roles && (
          <span className="rounded-full border border-ink-line bg-ink-soft px-3 py-0.5 text-xs text-steam">
            {section.roles}
          </span>
        )}
        {section.href && (
          <Link
            href={section.href}
            className="text-sm font-semibold text-fizz hover:underline"
          >
            Open page →
          </Link>
        )}
      </div>
      <p className="mt-2 max-w-[68ch] text-cream">{section.intro}</p>
      <div className="mt-4 space-y-4">
        {section.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </section>
  );
}

// In-app help guide. A searchable, anchored reference for every page and the
// common workflows. Content lives in lib/store/docs-content.ts.
export default function DocsView() {
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_SECTIONS;
    return DOC_SECTIONS.filter((s) => {
      const hay = [
        s.title,
        s.intro,
        s.roles ?? "",
        ...s.blocks.flatMap((b) =>
          b.kind === "p" || b.kind === "tip"
            ? [b.text]
            : b.kind === "steps"
              ? b.items
              : b.items.flat(),
        ),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Help
      </p>
      <h1 className="mt-2 font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
        How Fizz works
      </h1>
      <p className="mt-2 max-w-[68ch] text-steam">
        A guide to every page, what each section does, and how to get things
        done — from ringing an order to building your menu.
      </p>

      {/* Search */}
      <div className="relative mt-6 max-w-md">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steam">
          ⌕
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the docs…"
          className="w-full rounded-fizz border border-ink-line bg-ink-soft py-2.5 pl-10 pr-4 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
        />
      </div>

      {/* Quick recipes (hidden while searching) */}
      {!query && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
            Quick how-tos
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_RECIPES.map((r) => (
              <div
                key={r.title}
                className="flex flex-col rounded-fizz border border-ink-line bg-ink-soft p-5"
              >
                <h3 className="font-display font-bold text-cream">{r.title}</h3>
                <ol className="mt-3 flex-1 space-y-1.5 text-sm text-steam">
                  {r.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-fizz">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <Link
                  href={r.href}
                  className="mt-4 text-sm font-semibold text-fizz hover:underline"
                >
                  Go →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        {/* Table of contents (sticky on desktop, hidden while searching) */}
        {!query && (
          <nav className="hidden lg:block">
            <div className="sticky top-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
                On this page
              </p>
              <ul className="mt-3 space-y-1.5">
                {DOC_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-md px-2 py-1 text-sm text-steam transition-colors hover:bg-ink-line/40 hover:text-cream"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        {/* Sections */}
        <div className={query ? "lg:col-span-2" : ""}>
          {sections.length === 0 ? (
            <p className="text-steam">
              No matches for “{query}”. Try a different word.
            </p>
          ) : (
            <div className="space-y-12 divide-y divide-ink-line [&>*:not(:first-child)]:pt-12">
              {sections.map((s) => (
                <Section key={s.id} section={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
