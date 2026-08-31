"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { MENU_FONT_SCALES } from "@/lib/db/schema";
import { MENU_THEMES } from "@/lib/store/menu-themes";
import { useSavedFlag } from "@/lib/hooks/useSavedFlag";
import type { OrderSettings, Store } from "@/lib/db/schema";


const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

const SCALE_LABELS: Record<string, string> = { sm: "Small", md: "Medium", lg: "Large" };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function PublicMenuModal({
  store,
  settings,
  origin,
  isOpen,
  onClose,
}: {
  store: Store;
  settings: OrderSettings;
  origin: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const save = useMutation(
    trpc.menu.updateAppearance.mutationOptions({ onSuccess: () => toast.success("Menu settings saved") }),
  );
  const saved = useSavedFlag(save.isSuccess);

  const [slug, setSlug] = useState(store.menuSlug ?? (slugify(store.name) || "menu"));
  const [published, setPublished] = useState(store.menuPublished);
  const [scale, setScale] = useState(store.menuFontScale);
  const [accent, setAccent] = useState(store.menuAccent);
  const [theme, setTheme] = useState(store.menuTheme);
  const [ordering, setOrdering] = useState(settings.ordering);
  const [delivery, setDelivery] = useState(settings.delivery);

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

        <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(fields(e.currentTarget));
        }} className="mt-6 flex flex-col gap-6">
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

            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className={labelCls}>Theme</span>
              <p className="text-xs text-steam">
                Picking a theme sets a matching accent — change it below if you want your own.
              </p>
              <input type="hidden" name="menuTheme" value={theme} />
              <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {MENU_THEMES.map((t) => {
                  const on = t.key === theme;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setTheme(t.key);
                        setAccent(t.accent.toUpperCase());
                      }}
                      title={t.blurb}
                      className={`overflow-hidden rounded-fizz border text-left transition-transform hover:scale-[1.03] ${
                        on ? "border-fizz ring-2 ring-fizz/40" : "border-ink-line"
                      }`}
                    >
                      {/* Swatch renders in the theme's own colors — what you pick is what you get. */}
                      <span
                        className="flex h-20 flex-col justify-between p-3"
                        style={{ backgroundColor: t.bg, color: t.text, fontFamily: t.display }}
                      >
                        <span className="text-[13px] font-semibold leading-none">Flat White</span>
                        <span className="flex items-center justify-between">
                          <span
                            className="h-3 w-8 rounded-full"
                            style={{ backgroundColor: t.accent, borderRadius: t.radius }}
                          />
                          <span className="text-[12px] font-semibold" style={{ color: t.accent }}>
                            4.50
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2 bg-ink-soft px-3 py-2">
                        <span className="text-xs font-semibold text-cream">{t.name}</span>
                        {on && <span className="text-xs font-bold text-fizz">●</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
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

            <label className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" name="ordering" value="true" checked={ordering} onChange={(e) => setOrdering(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
              <span className="text-sm text-cream">
                Accept orders from public menu
                <span className="block text-xs text-steam">
                  Adds a cart. Guests send their order to your WhatsApp — you key it in at the till.
                </span>
              </span>
            </label>

            {ordering && (
              <div className="flex flex-col gap-5 rounded-fizz border border-ink-line bg-ink-soft p-5 sm:col-span-2">
                <label className="flex flex-col gap-2">
                  <span className={labelCls}>WhatsApp number</span>
                  <input
                    name="whatsapp"
                    defaultValue={settings.whatsapp ?? ""}
                    placeholder="919876543210 (country code, no +)"
                    inputMode="tel"
                    className={inputCls}
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <span className={labelCls}>How guests can get it</span>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="dineIn" value="true" defaultChecked={settings.dineIn} className="h-5 w-5 accent-[#C6F432]" />
                      <span className="text-sm text-cream">Dine-in</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="takeaway" value="true" defaultChecked={settings.takeaway} className="h-5 w-5 accent-[#C6F432]" />
                      <span className="text-sm text-cream">Takeaway</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="delivery" value="true" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
                      <span className="text-sm text-cream">Home delivery</span>
                    </label>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelCls}>Delivery fee ({store.currency})</span>
                  <input
                    name="deliveryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.deliveryFee}
                    className={inputCls}
                  />
                  <span className="text-xs text-steam">
                    {delivery
                      ? "Added to the guest's total when they pick delivery. 0 = free."
                      : "Turn on home delivery to charge this."}
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className={labelCls}>Packaging, per item ({store.currency})</span>
                  <input
                    name="packagingFee"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.packagingFee}
                    className={inputCls}
                  />
                  <span className="text-xs text-steam">
                    Charged per item on takeaway and delivery. Dine-in never pays it.
                  </span>
                </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-ink-line pt-6">
            <button type="submit" disabled={save.isPending} className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60">
              {save.isPending ? "Saving…" : "Save menu settings"}
            </button>
            {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
            {save.error && <span className="text-sm text-[#E2655A]">{save.error.message}</span>}
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
