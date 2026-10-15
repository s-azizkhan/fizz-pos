"use client";

import { useState } from "react";
import { CARD_KINDS, CARD_PRESETS, LAYOUTS, newCard, type CardKind, type WelcomeCard, type WelcomeConfig } from "@/lib/store/welcome";
import { applyOrder, useDragSort } from "./useDragSort";
import ImageField from "@/components/fizz/ui/ImageField";
import { CardIcon } from "./WelcomeCards";
import { EyeIcon, EyeOffIcon, GripIcon, PlusIcon, TrashIcon } from "@/components/fizz/dashboard/icons";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink px-3 py-2 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

// Admin editor for the welcome screen. Controlled: the modal owns the config
// (it also feeds the live preview) and this ships it as one hidden JSON field
// (`menuWelcome`) with the rest of the form. Hints under each card say what
// the public page needs to show it.
export default function WelcomeEditor({
  value: cfg,
  onChange,
  hasPhone,
  hasWhatsapp,
}: {
  value: WelcomeConfig;
  onChange: (next: WelcomeConfig) => void;
  hasPhone: boolean;
  hasWhatsapp: boolean;
}) {
  // The textarea keeps its raw text (blank lines while typing); the config
  // gets the cleaned list.
  const [socials, setSocials] = useState(cfg.socials.join("\n"));
  const patch = (p: Partial<WelcomeConfig>) => onChange({ ...cfg, ...p });
  const patchCard = (id: string, p: Partial<WelcomeCard>) =>
    patch({ cards: cfg.cards.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const sort = useDragSort("welcome-cards", cfg.cards.map((c) => c.id), (ids) =>
    patch({ cards: applyOrder(cfg.cards, ids) }),
  );
  const shown = applyOrder(cfg.cards, sort.order);
  const out = cfg;

  const badLink = (u: string | undefined) => !!u && !/^https?:\/\/\S+$/.test(u);
  const needs = (c: WelcomeCard): string | null => {
    if ((c.kind === "review" || c.kind === "link") && badLink(c.href)) return "Link must start with https://";
    if (badLink(c.lottie)) return "Link must start with https://";
    if (c.kind === "call" && !hasPhone) return "Add a phone number in Store settings to show this.";
    if (c.kind === "whatsapp" && !hasWhatsapp) return "Add a WhatsApp number below to show this.";
    if (c.kind === "wifi" && !c.ssid) return "Needs a network name to show.";
    if ((c.kind === "review" || c.kind === "link") && !c.href) return "Needs a link to show.";
    return null;
  };

  return (
    <div className="flex flex-col gap-5 sm:col-span-2">
      <input type="hidden" name="menuWelcome" value={JSON.stringify(out)} />
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={cfg.on}
          onChange={(e) => patch({ on: e.target.checked })}
          className="h-5 w-5 accent-[#C6F432]"
        />
        <span className="text-sm text-cream">
          Welcome screen before the menu
          <span className="block text-xs text-steam">
            Cover, your name, a table badge and tappable cards. Menu stays at /menu.
          </span>
        </span>
      </label>

      {cfg.on && (
        <div className="flex flex-col gap-5 rounded-fizz border border-ink-line bg-ink-soft p-5">
          <div className="flex flex-col gap-2">
            <span className={labelCls}>Template</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LAYOUTS.map((l) => {
                const on = (cfg.layout ?? "cover") === l.key;
                return (
                  <button
                    key={l.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patch({ layout: l.key })}
                    title={l.blurb}
                    className={`overflow-hidden rounded-fizz border text-left transition-transform hover:scale-[1.03] ${on ? "border-fizz ring-2 ring-fizz/40" : "border-ink-line"}`}
                  >
                    <LayoutSketch layout={l.key} />
                    <span className="flex items-center justify-between gap-2 bg-ink px-3 py-2">
                      <span className="text-xs font-semibold text-cream">{l.name}</span>
                      {on && <span className="text-xs font-bold text-fizz">●</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-steam">{LAYOUTS.find((l) => l.key === (cfg.layout ?? "cover"))?.blurb}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelCls}>Cover image</span>
            <ImageField
              kind="cover"
              value={cfg.coverUrl ?? ""}
              onChange={(v) => patch({ coverUrl: v })}
              maxEdge={1600}
              hint="Landscape works best — your storefront, the oven, the bar. Blank = a wash of your accent color."
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className={labelCls}>Hero animation (Lottie)</span>
            <input
              value={cfg.heroLottie ?? ""}
              onChange={(e) => patch({ heroLottie: e.target.value })}
              placeholder="https://lottie.host/….lottie"
              inputMode="url"
              className={inputCls}
            />
            <span className={`text-xs ${badLink(cfg.heroLottie) ? "text-[#E2655A]" : "text-steam"}`}>
              {badLink(cfg.heroLottie)
                ? "Link must start with https://"
                : "Plays over the cover. Paste a .lottie or .json link from lottiefiles.com (free ones work; pick a transparent background)."}
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <span className={labelCls}>Cards</span>
            <p className="text-xs text-steam">Drag to reorder. The first card is the highlighted one.</p>
            <div className="flex flex-col gap-2">
              {shown.map((c) => {
                const why = needs(c);
                return (
                  <div
                    key={c.id}
                    data-sort="welcome-cards"
                    data-id={c.id}
                    className={`rounded-fizz border border-ink-line bg-ink p-3 ${sort.dragId === c.id ? "opacity-70 ring-2 ring-fizz/40" : ""} ${c.on ? "" : "opacity-60"}`}
                  >
                    <div className="flex items-center gap-2">
                      <button {...sort.handle(c.id)} className="shrink-0 cursor-grab touch-none rounded p-1 text-steam hover:text-fizz">
                        <GripIcon className="h-4 w-4" />
                      </button>
                      <span className="shrink-0 text-fizz [&>svg]:h-5 [&>svg]:w-5">
                        <CardIcon kind={c.kind} />
                      </span>
                      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-steam">
                        {CARD_PRESETS[c.kind].label}
                      </span>
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => patchCard(c.id, { on: !c.on })}
                          aria-label={c.on ? "Hide card" : "Show card"}
                          className="rounded p-1 text-steam hover:text-fizz"
                        >
                          {c.on ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => patch({ cards: cfg.cards.filter((x) => x.id !== c.id) })}
                          aria-label="Remove card"
                          className="rounded p-1 text-steam hover:text-[#E2655A]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        value={c.title}
                        onChange={(e) => patchCard(c.id, { title: e.target.value.slice(0, 40) })}
                        placeholder="Title"
                        className={inputCls}
                      />
                      <input
                        value={c.subtitle}
                        onChange={(e) => patchCard(c.id, { subtitle: e.target.value.slice(0, 60) })}
                        placeholder="Subtitle"
                        className={inputCls}
                      />
                      {(c.kind === "review" || c.kind === "link") && (
                        <input
                          value={c.href ?? ""}
                          onChange={(e) => patchCard(c.id, { href: e.target.value })}
                          placeholder={c.kind === "review" ? "https://g.page/r/…/review" : "https://…"}
                          inputMode="url"
                          className={`${inputCls} sm:col-span-2`}
                        />
                      )}
                      <input
                        value={c.lottie ?? ""}
                        onChange={(e) => patchCard(c.id, { lottie: e.target.value })}
                        placeholder="Lottie icon URL (optional) — replaces the line icon"
                        inputMode="url"
                        className={`${inputCls} sm:col-span-2`}
                      />
                      {c.kind === "wifi" && (
                        <>
                          <input
                            value={c.ssid ?? ""}
                            onChange={(e) => patchCard(c.id, { ssid: e.target.value.slice(0, 60) })}
                            placeholder="Network name"
                            className={inputCls}
                          />
                          <input
                            value={c.password ?? ""}
                            onChange={(e) => patchCard(c.id, { password: e.target.value.slice(0, 80) })}
                            placeholder="Password"
                            className={inputCls}
                          />
                        </>
                      )}
                    </div>
                    {why && <p className={`mt-2 text-xs ${why.startsWith("Link must") ? "text-[#E2655A]" : "text-steam"}`}>{why}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {CARD_KINDS.map((k: CardKind) => (
                <button
                  key={k}
                  type="button"
                  disabled={cfg.cards.length >= 12}
                  onClick={() => patch({ cards: [...cfg.cards, newCard(k)] })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-line px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz disabled:opacity-50"
                >
                  <PlusIcon className="h-3 w-3" />
                  {CARD_PRESETS[k].label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className={labelCls}>Social links</span>
            <textarea
              value={socials}
              onChange={(e) => {
                setSocials(e.target.value);
                patch({ socials: e.target.value.split(/\s+/).map((s) => s.trim()).filter(Boolean) });
              }}
              rows={3}
              placeholder={"https://instagram.com/yourcafe\nhttps://facebook.com/yourcafe\nhttps://tiktok.com/@yourcafe"}
              className={inputCls}
            />
            <span className={`text-xs ${out.socials.some(badLink) ? "text-[#E2655A]" : "text-steam"}`}>
              {out.socials.some(badLink)
                ? "Every link must start with https://"
                : "One per line. Icons pick themselves from the link (Instagram, Facebook, TikTok, X, YouTube, Google Maps)."}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

// Tiny wireframe of each template, drawn in brand tokens.
function LayoutSketch({ layout }: { layout: string }) {
  const bar = (w: string) => <span className={`block h-1.5 rounded-full bg-ink-line ${w}`} />;
  const card = (k: number, primary = false) => (
    <span key={k} className={`block h-3 rounded-[3px] ${primary ? "bg-fizz/60" : "bg-ink-line"}`} />
  );
  return (
    <span className="flex h-20 flex-col gap-1 bg-ink-soft p-2">
      {layout === "cover" && (
        <>
          <span className="block h-7 rounded-[4px] bg-fizz/30" />
          {card(1, true)}
          {card(2)}
          {card(3)}
        </>
      )}
      {layout === "poster" && (
        <span className="relative block h-full rounded-[4px] bg-fizz/30 p-1.5">
          <span className="mx-auto mb-1 block h-3 w-3 rounded-full bg-cream/70" />
          <span className="flex flex-col gap-1">{[card(1, true), card(2), card(3)].map((c, i) => <span key={i} className="opacity-70">{c}</span>)}</span>
        </span>
      )}
      {layout === "minimal" && (
        <>
          <span className="mx-auto block h-5 w-5 rounded-full border-2 border-fizz" />
          {bar("mx-auto w-10")}
          {bar("w-full")}
          {bar("w-full")}
          {bar("w-full")}
        </>
      )}
      {layout === "tiles" && (
        <>
          <span className="block h-5 rounded-[4px] bg-fizz/30" />
          {card(1, true)}
          <span className="grid grid-cols-2 gap-1">
            <span className="block h-5 rounded-[3px] bg-ink-line" />
            <span className="block h-5 rounded-[3px] bg-ink-line" />
          </span>
        </>
      )}
    </span>
  );
}
