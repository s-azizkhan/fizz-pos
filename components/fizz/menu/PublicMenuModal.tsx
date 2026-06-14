"use client";

import { useActionState, useState } from "react";
import { updateMenuAppearance, type MenuState } from "@/app/actions/menu";
import { MENU_FONTS, MENU_FONT_SCALES } from "@/lib/db/schema";
import { useSavedFlag } from "@/lib/hooks/useSavedFlag";
import type { Store } from "@/lib/db/schema";

const initial: MenuState = { ok: false };

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

const FONT_LABELS: Record<string, string> = {
  sans: "Sans (Inter)",
  display: "Display (Space Grotesk)",
  serif: "Serif",
  mono: "Mono",
};
const SCALE_LABELS: Record<string, string> = { sm: "Small", md: "Medium", lg: "Large" };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function PublicMenuModal({
  store,
  origin,
  isOpen,
  onClose,
}: {
  store: Store;
  origin: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateMenuAppearance, initial);
  const saved = useSavedFlag(state.ok);

  const [slug, setSlug] = useState(store.menuSlug ?? (slugify(store.name) || "menu"));
  const [published, setPublished] = useState(store.menuPublished);
  const [font, setFont] = useState(store.menuFont);
  const [scale, setScale] = useState(store.menuFontScale);
  const [accent, setAccent] = useState(store.menuAccent);

  const url = `${origin}/m/${slug}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-fizz bg-ink p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Public menu</h2>
            <p className="mt-1 text-sm text-steam">
              A shareable, view-only menu with your café branding.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-steam hover:text-fizz"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form action={action} className="mt-6 flex flex-col gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className={labelCls}>Menu link</span>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-steam">{origin}/m/</span>
                <input
                  name="menuSlug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className={inputCls}
                />
              </div>
              {published && (
                <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-bubble hover:underline">
                  {url} ↗
                </a>
              )}
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className={labelCls}>Tagline</span>
              <input name="menuTagline" defaultValue={store.menuTagline ?? ""} placeholder="Pour-overs, pastries, good mornings." className={inputCls} />
            </label>

            <label className="flex flex-col gap-2">
              <span className={labelCls}>Font</span>
              <select name="menuFont" value={font} onChange={(e) => setFont(e.target.value)} className={`${inputCls} appearance-none`}>
                {MENU_FONTS.map((f) => (
                  <option key={f} value={f} className="bg-ink-soft text-cream">{FONT_LABELS[f]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Font size</span>
              <select name="menuFontScale" value={scale} onChange={(e) => setScale(e.target.value)} className={`${inputCls} appearance-none`}>
                {MENU_FONT_SCALES.map((s) => (
                  <option key={s} value={s} className="bg-ink-soft text-cream">{SCALE_LABELS[s]}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className={labelCls}>Accent color</span>
              <div className="flex items-center gap-3">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-fizz border border-ink-line bg-ink-soft" />
                <input name="menuAccent" value={accent} onChange={(e) => setAccent(e.target.value.toUpperCase())} className={inputCls} />
              </div>
            </label>

            <label className="flex items-center gap-3 pt-7">
              <input type="checkbox" name="menuPublished" value="true" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
              <span className="text-sm text-cream">Publish menu (make it public)</span>
            </label>
          </div>

          <div className="flex items-center gap-4 border-t border-ink-line pt-6">
            <button type="submit" disabled={pending} className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60">
              {pending ? "Saving…" : "Save menu settings"}
            </button>
            {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
            {state.error && <span className="text-sm text-[#E2655A]">{state.error}</span>}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
