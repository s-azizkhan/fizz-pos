"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import { fields } from "@/lib/trpc/fields";
import { MENU_FONT_SCALES } from "@/lib/db/schema/constants";
import { MENU_THEMES } from "@/lib/store/menu-themes";
import { useSavedFlag } from "@/lib/hooks/useSavedFlag";
import type { OrderSettings, Store } from "@/lib/db/schema";
import NumberInput from "@/components/fizz/ui/NumberInput";
import WelcomeEditor from "@/components/fizz/menu/WelcomeEditor";
import Welcome from "@/components/fizz/menu/Welcome";
import { DEFAULT_WELCOME, type WelcomeConfig } from "@/lib/store/welcome";
import { CheckIcon, CloseIcon, ExternalIcon, EyeIcon } from "@/components/fizz/dashboard/icons";


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
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp ?? "");
  const [welcome, setWelcome] = useState<WelcomeConfig>(store.menuWelcome ?? DEFAULT_WELCOME);
  // Phone: the preview is a full-screen overlay behind this flag. Desktop: a
  // column beside the form, always on.
  const [previewOpen, setPreviewOpen] = useState(false);
  // Tabs hide sections with the `hidden` attribute (not unmount) so every
  // field still submits with the one form.
  type Tab = "link" | "look" | "welcome" | "ordering";
  const [tab, setTab] = useState<Tab>("link");
  const TABS: { key: Tab; label: string; badge?: string }[] = [
    { key: "link", label: "Link", badge: published ? "Live" : "Draft" },
    { key: "look", label: "Look" },
    { key: "welcome", label: "Welcome screen", badge: welcome.on ? "On" : undefined },
    { key: "ordering", label: "Ordering", badge: ordering ? "On" : undefined },
  ];
  const waDigits = whatsapp.replace(/\D/g, "");
  const preview = (
    <Welcome
      embedded
      slug={slug}
      store={{ ...store, menuTheme: theme, menuAccent: accent, menuWelcome: { ...welcome, on: true } }}
      whatsapp={waDigits.length >= 8 ? waDigits : null}
      table="5"
    />
  );

  const url = `${origin}/m/${slug}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4">
      <div className={`flex h-dvh w-full flex-col overflow-hidden bg-ink sm:h-[90vh] sm:rounded-fizz sm:border sm:border-ink-line sm:shadow-lg ${welcome.on ? "max-w-2xl lg:max-w-5xl" : "max-w-2xl"}`}>
        <div className="shrink-0 border-b border-ink-line px-5 pt-5 sm:px-8 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold tracking-tight">Public menu</h2>
              <p className="mt-1 text-sm text-steam">Your café on a link: menu, welcome screen, web orders.</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full border border-ink-line p-2 text-steam transition-colors hover:border-fizz hover:text-fizz"
              aria-label="Close modal"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div role="tablist" className="-mx-5 mt-4 flex gap-1 overflow-x-auto px-5 no-scrollbar sm:-mx-8 sm:px-8">
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t.key)}
                  className={`relative shrink-0 whitespace-nowrap px-3 pb-3 pt-1 text-sm font-semibold transition-colors ${on ? "text-cream" : "text-steam hover:text-cream"}`}
                >
                  {t.label}
                  {t.badge && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.badge === "Draft" ? "bg-ink-soft text-steam" : "bg-fizz/15 text-fizz"}`}>
                      {t.badge}
                    </span>
                  )}
                  {on && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-fizz" />}
                </button>
              );
            })}
          </div>
        </div>

        <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(fields(e.currentTarget));
        }} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8">

          {/* ---- Link & publish ---- */}
          <div hidden={tab !== "link"} className="grid gap-5 sm:grid-cols-2 [&[hidden]]:hidden">
            <label className="flex items-center gap-3 rounded-fizz border border-ink-line bg-ink-soft p-4 sm:col-span-2">
              <input type="checkbox" name="menuPublished" value="true" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
              <span className="text-sm text-cream">
                Publish menu
                <span className="block text-xs text-steam">Off = the link shows “not found”. Nothing else changes.</span>
              </span>
            </label>
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
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-bubble hover:underline">
                  <span className="truncate">{url}</span>
                  <ExternalIcon className="h-3.5 w-3.5 shrink-0" />
                </a>
              )}
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className={labelCls}>Tagline</span>
              <input name="menuTagline" defaultValue={store.menuTagline ?? ""} placeholder="Pour-overs, pastries, good mornings." className={inputCls} />
              <span className="text-xs text-steam">Under your name on the menu, the welcome screen and in search results.</span>
            </label>
          </div>

          {/* ---- Look ---- */}
          <div hidden={tab !== "look"} className="grid gap-5 sm:grid-cols-2 [&[hidden]]:hidden">
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

          </div>

          {/* ---- Welcome screen ---- */}
          <div hidden={tab !== "welcome"} className="grid gap-5 sm:grid-cols-2 [&[hidden]]:hidden">
            <WelcomeEditor
              value={welcome}
              onChange={setWelcome}
              hasPhone={!!store.phone}
              hasWhatsapp={waDigits.length >= 8}
            />
          </div>

          {/* ---- Ordering ---- */}
          <div hidden={tab !== "ordering"} className="grid gap-5 sm:grid-cols-2 [&[hidden]]:hidden">
            <label className="flex items-center gap-3 rounded-fizz border border-ink-line bg-ink-soft p-4 sm:col-span-2">
              <input type="checkbox" name="ordering" value="true" checked={ordering} onChange={(e) => setOrdering(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
              <span className="text-sm text-cream">
                Accept orders from public menu
                <span className="block text-xs text-steam">
                  Adds a cart. Guests send their order to your WhatsApp — you key it in at the POS.
                </span>
              </span>
            </label>

            {/* Stay mounted when off so the fields still submit (else deliveryFee is undefined → invalid). */}
              <div
                hidden={!ordering}
                className="flex flex-col gap-5 rounded-fizz border border-ink-line bg-ink-soft p-5 sm:col-span-2 [&[hidden]]:hidden"
              >
                <label className="flex flex-col gap-2">
                  <span className={labelCls}>WhatsApp number</span>
                  <input
                    name="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
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
                  <NumberInput name="deliveryFee" defaultValue={settings.deliveryFee} />
                  <span className="text-xs text-steam">
                    {delivery
                      ? "Added to the guest's total when they pick delivery. 0 = free."
                      : "Turn on home delivery to charge this."}
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className={labelCls}>Packaging, per item ({store.currency})</span>
                  <NumberInput name="packagingFee" defaultValue={settings.packagingFee} />
                  <span className="text-xs text-steam">
                    Charged per item on takeaway and delivery. Dine-in never pays it.
                  </span>
                </label>
                </div>
              </div>
          </div>
          </div>

          {/* Live preview — desktop column, scrolls on its own. */}
          {welcome.on && (
            <aside className="hidden w-[360px] shrink-0 flex-col overflow-y-auto border-l border-ink-line bg-ink-soft/40 p-5 lg:flex">
              <span className={labelCls}>Live preview</span>
              <p className="mt-1 text-xs text-steam">What a guest sees scanning table 5. Updates as you type.</p>
              <div className="mt-4 flex justify-center">
                <PhoneFrame>{preview}</PhoneFrame>
              </div>
            </aside>
          )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-ink-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-8 sm:py-4">
            {welcome.on && (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-4 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz lg:hidden"
              >
                <EyeIcon className="h-4 w-4 shrink-0" />
                Preview
              </button>
            )}
            <button type="submit" disabled={save.isPending} className="inline-flex items-center justify-center gap-2 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60">
              <CheckIcon className="h-4 w-4 shrink-0" />
              {save.isPending ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
            {save.error && <span className="text-sm text-[#E2655A]">{save.error.message}</span>}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 ml-auto rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
            >
              <CloseIcon className="h-4 w-4 shrink-0" />
              Close
            </button>
          </div>
        </form>
      </div>

      {/* Phone: full-screen preview overlay. */}
      {previewOpen && welcome.on && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-ink lg:hidden" role="dialog" aria-label="Welcome screen preview">
          <div className="flex items-center justify-between gap-3 border-b border-ink-line px-5 py-3">
            <span className="text-sm font-semibold text-cream">
              Live preview <span className="text-xs text-steam">· table 5 · unsaved changes included</span>
            </span>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="inline-flex items-center gap-2 rounded-fizz bg-fizz px-4 py-2 text-sm font-semibold text-ink"
            >
              <CloseIcon className="h-4 w-4" />
              Back to edit
            </button>
          </div>
          <div data-wl-scroller className="min-h-0 flex-1 overflow-y-auto">{preview}</div>
        </div>
      )}
    </div>
  );
}

// A 390px-wide phone, scaled down to fit the column. The inner page scrolls
// on its own so long card lists stay reachable.
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[593px] w-[304px] xl:h-[646px] xl:w-[332px]">
      <div className="origin-top-left scale-[0.78] xl:scale-[0.85]">
      <div className="h-[760px] w-[390px] overflow-hidden rounded-[40px] border-[6px] border-ink-line bg-ink shadow-lg">
        <div data-wl-scroller className="h-full overflow-y-auto no-scrollbar">{children}</div>
      </div>
      </div>
    </div>
  );
}
