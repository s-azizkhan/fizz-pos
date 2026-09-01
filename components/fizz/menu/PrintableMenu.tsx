"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/store/format";
import { resolveCategoryIcon } from "@/components/fizz/menu/category-icons";
import {
  MENU_COLOR_SCHEMES,
  getMenuColorScheme,
} from "@/components/fizz/menu/print-styles";
import {
  MENU_LAYOUTS,
  getMenuLayout,
  type MenuLayout,
} from "@/components/fizz/menu/menu-layouts";
import {
  MENU_BG_PACKS,
  getMenuBgPack,
  MenuBgLayer,
} from "@/components/fizz/menu/bg-packs";
import type { MenuCategoryWithItems } from "@/lib/store/menu";
import type { OrderSettings, Store } from "@/lib/db/schema";

// Contact icons — inline so html-to-image PNG export needs no font/icon lib.
const svg = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const PhoneIcon = () => (
  <svg {...svg}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z" />
  </svg>
);

const InstagramIcon = () => (
  <svg {...svg}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const GlobeIcon = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20Z" />
  </svg>
);

// Self-contained printable menu. Renders a cover page, the category sections
// (page-break aware), and a closing/contact page. Browser print ("Save as PDF")
// is the export path — true WYSIWYG, no extra deps. `embed` hides the toolbar
// so the same route can be dropped into a preview iframe.
export default function PrintableMenu({
  store,
  categories,
  ordering,
  schemeId,
  layoutId,
  packId,
  opacity,
  fontScale,
  fold,
  embed = false,
}: {
  store: Store;
  categories: MenuCategoryWithItems[];
  /** null until the café saves ordering settings once. */
  ordering: OrderSettings | null;
  schemeId: string; // color scheme (palette + type)
  layoutId: string; // appearance / layout
  packId: string;
  opacity: number; // background watermark opacity, %
  fontScale: number; // menu body font size, %
  fold: boolean; // A3 landscape sheets folded into an A4 booklet
  embed?: boolean;
}) {
  const router = useRouter();
  const scheme = getMenuColorScheme(schemeId);
  const layout = getMenuLayout(layoutId);
  const pack = getMenuBgPack(packId);

  // Opacity + font scale are pure CSS — drive them from local state so the
  // sliders update instantly without a server round-trip. Scheme/layout/pack
  // still navigate; navigation carries the slider values along so they survive
  // a reload.
  const [op, setOp] = useState(opacity ?? 16);
  const [fs, setFs] = useState(fontScale ?? 100);
  const [busy, setBusy] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);

  // PNG export: rasterize the page surface at 3x for print-grade pixels.
  // Multi-page layouts come out as one tall image; the one-page layout is a
  // single sheet. ponytail: 3x is the sweet spot — 4x blows past canvas limits
  // on A4 in Safari.
  const savePng = useCallback(async () => {
    const root = pagesRef.current;
    if (!root || busy) return;
    // Capture each .pdf-page on its own: rasterizing the centered wrapper
    // bakes its page offset into the canvas and crops the sheet.
    const pages = Array.from(root.querySelectorAll<HTMLElement>(".pdf-page"));
    if (pages.length === 0) return;
    setBusy(true);
    try {
      const base = store.menuSlug || "menu";
      for (const [i, page] of pages.entries()) {
        const url = await toPng(page, {
          pixelRatio: 3,
          backgroundColor: scheme.bg,
          cacheBust: true,
          width: page.offsetWidth,
          height: page.offsetHeight,
          style: { margin: "0", boxShadow: "none" },
        });
        const a = document.createElement("a");
        a.href = url;
        a.download =
          pages.length > 1 ? `${base}-${i + 1}.png` : `${base}.png`;
        a.click();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, scheme.bg, store.menuSlug]);

  // Let the embedding preview modal trigger the same export.
  useEffect(() => {
    const w = window as unknown as { __fizzMenuPng?: () => void };
    w.__fizzMenuPng = savePng;
    return () => {
      delete w.__fizzMenuPng;
    };
  }, [savePng]);

  const contactBits = [
    [store.addressLine1, store.addressLine2].filter(Boolean).join(", "),
    [store.city, store.state, store.postalCode].filter(Boolean).join(" "),
    store.country,
  ].filter(Boolean) as string[];

  // Fulfilment line on the single-page strip, from the ordering settings.
  const modes = [
    ordering?.dineIn && "Dine-in",
    ordering?.takeaway && "Takeaway",
    ordering?.delivery && "Home delivery",
  ].filter(Boolean) as string[];
  const stripLine = modes.length
    ? `Order now! · ${modes.join(" & ")} available`
    : "Order now!";

  const reachBits = [
    store.phone && { label: "Call", icon: PhoneIcon, value: store.phone },
    store.instagram && {
      label: "Instagram",
      icon: InstagramIcon,
      value: `@${store.instagram.replace(/^@/, "")}`,
    },
    store.website && {
      label: "Web",
      icon: GlobeIcon,
      value: store.website.replace(/^https?:\/\//, ""),
    },
  ].filter(Boolean) as { label: string; icon: () => React.ReactElement; value: string }[];

  const vars = {
    ["--pg-bg" as string]: scheme.bg,
    ["--pg-fg" as string]: scheme.fg,
    ["--pg-muted" as string]: scheme.muted,
    ["--pg-accent" as string]: scheme.accent,
    ["--pg-accent-fg" as string]: scheme.accentFg,
    ["--pg-divider" as string]: scheme.divider,
    ["--pg-head" as string]: scheme.fontHead,
    ["--pg-body" as string]: scheme.fontBody,
    ["--pg-bg-opacity" as string]: op / 100,
    ["--pg-scale" as string]: fs / 100,
  } as React.CSSProperties;

  const headStyle: React.CSSProperties = {
    fontFamily: "var(--pg-head)",
    textTransform: layout.uppercaseHeads ? "uppercase" : "none",
    letterSpacing: layout.uppercaseHeads ? "0.04em" : "-0.01em",
  };

  // navigate(): build the route URL preserving every axis. Partial overrides
  // keep the rest from the current selection.
  const navigate = (next: {
    scheme?: string;
    layout?: string;
    pack?: string;
    fold?: boolean;
  }) =>
    router.replace(
      `/menu-pdf?scheme=${next.scheme ?? scheme.id}` +
        `&layout=${next.layout ?? layout.id}` +
        `&pack=${next.pack ?? pack.id}&op=${op}&fs=${fs}` +
        `&fold=${(next.fold ?? fold) ? "1" : "0"}`,
      { scroll: false },
    );

  return (
    <div
      className="menu-pdf-root"
      style={vars}
      data-density={layout.density}
      data-frame={layout.framed ? "1" : undefined}
      data-dash={layout.dashed ? "1" : undefined}
      data-single={layout.single ? layout.id : undefined}
      data-fold={fold ? "1" : undefined}
    >
      <style>{PRINT_CSS}</style>
      {/* Folded layouts print on A3 landscape; a later @page rule wins. */}
      {fold && <style>{"@page { size: A3 landscape; margin: 0; }"}</style>}

      {!embed && (
        <Toolbar
          schemeId={scheme.id}
          layoutId={layout.id}
          packId={pack.id}
          op={op}
          fs={fs}
          hasBg={pack.glyphs.length > 0}
          fold={fold}
          onOpacity={setOp}
          onFontScale={setFs}
          onNavigate={navigate}
          onPng={savePng}
          busy={busy}
        />
      )}

      <div className="menu-pdf-pages" ref={pagesRef}>
        {/* ---- A3 FOLD: outside sheet — back panel + front cover ---- */}
        {fold && (
          <section className="pdf-page pdf-sheet" data-cover={layout.cover}>
            <MenuBgLayer pack={pack} seed={0} />
            <div className="pdf-content pdf-sheet-inner">
              <div className="pdf-panel">
                <Closing
                  store={store}
                  headStyle={headStyle}
                  contactBits={contactBits}
                  reachBits={reachBits}
                />
              </div>
              <div className="pdf-panel">
                <Cover store={store} layout={layout} headStyle={headStyle} />
              </div>
            </div>
          </section>
        )}

        {/* ---- COVER (skipped by single-page and folded layouts) ---- */}
        {!layout.single && !fold && (
          <section className="pdf-page pdf-cover" data-cover={layout.cover}>
            <MenuBgLayer pack={pack} seed={0} />
            <div className="pdf-content">
              <Cover store={store} layout={layout} headStyle={headStyle} />
            </div>
          </section>
        )}

        {/* ---- MENU BODY ---- */}
        <section className="pdf-page pdf-body">
          <MenuBgLayer pack={pack} seed={2} />
          <div className="pdf-content">
          {layout.single ? (
            <div className="pdf-brand-head">
              <div className="pdf-brand-badge" style={headStyle}>
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="pdf-brand-logo" src="/api/logo" alt={store.name} />
                ) : (
                  <span className="pdf-brand-name">{store.name}</span>
                )}
                {store.menuTagline && (
                  <span className="pdf-brand-tag">{store.menuTagline}</span>
                )}
              </div>
              <h2 className="pdf-brand-title" style={headStyle}>
                Menu
              </h2>
            </div>
          ) : (
            <div className="pdf-body-head">
              <span className="pdf-eyebrow" style={{ fontFamily: "var(--pg-body)" }}>
                Menu
              </span>
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pdf-logo pdf-logo-body" src="/api/logo" alt={store.name} />
              ) : (
                <h2 className="pdf-body-title" style={headStyle}>
                  {store.name}
                </h2>
              )}
            </div>
          )}

          {categories.length === 0 ? (
            <p className="pdf-empty">This menu is being plated.</p>
          ) : (
            <div className="pdf-cats" data-cols={layout.columns ?? 1}>
              {(() => {
                let n = 0; // running item number (receipt layout)
                return categories.map((cat) => (
                  <div key={cat.id} className="pdf-cat">
                    <div className="pdf-cat-head">
                      <span className="pdf-cat-icon" aria-hidden>
                        {resolveCategoryIcon(cat.icon)}
                      </span>
                      <h3 className="pdf-cat-name" style={headStyle}>
                        {cat.name}
                      </h3>
                      <span className="pdf-cat-rule" />
                    </div>

                    <div className="pdf-items">
                      {cat.items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          currency={store.currency}
                          trimZeros={!!layout.single}
                          variant={layout.itemRow}
                          num={layout.numbered ? ++n : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {layout.single && !fold && (
            <div className="pdf-strip-wrap">
              <div className="pdf-strip" style={headStyle}>
                {stripLine}
              </div>
              {reachBits.length > 0 && (
                <p className="pdf-strip-reach">
                  {reachBits.map((r) => (
                    <span key={r.label} className="pdf-strip-reach-item">
                      <r.icon />
                      {r.value}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
          </div>
        </section>

        {/* ---- CLOSING / CONTACT (skipped by single-page and folded layouts) ---- */}
        {!layout.single && !fold && (
        <section className="pdf-page pdf-close">
          <MenuBgLayer pack={pack} seed={4} />
          <div className="pdf-content">
          <Closing
            store={store}
            headStyle={headStyle}
            contactBits={contactBits}
            reachBits={reachBits}
          />
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

function Cover({
  store,
  layout,
  headStyle,
}: {
  store: Store;
  layout: MenuLayout;
  headStyle: React.CSSProperties;
}) {
  const since = `Est. ${[store.city, store.country].filter(Boolean).join(", ") || "fresh daily"}`;
  return (
    <div className="pdf-cover-inner">
      <p className="pdf-eyebrow" style={{ fontFamily: "var(--pg-body)" }}>
        {store.legalName || "Café"}
      </p>
      {store.logoUrl ? (
        // Served through /api/logo so it is same-origin — the PNG export
        // rasterizes it instead of throwing on a tainted canvas.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pdf-logo" src="/api/logo" alt={store.name} />
      ) : (
        <h1 className="pdf-cover-title" style={headStyle}>
          {store.name}
        </h1>
      )}
      {layout.cover === "editorial" && <span className="pdf-cover-bigrule" />}
      {store.menuTagline ? (
        <p className="pdf-cover-tag">{store.menuTagline}</p>
      ) : (
        <p className="pdf-cover-tag">Our menu, freshly poured.</p>
      )}
      <p className="pdf-cover-meta">{since}</p>
    </div>
  );
}

// Contact/closing panel. Its own component because the A3 fold layout prints
// it as the back panel of the outside sheet, not as a page of its own.
function Closing({
  store,
  headStyle,
  contactBits,
  reachBits,
}: {
  store: Store;
  headStyle: React.CSSProperties;
  contactBits: string[];
  reachBits: { label: string; icon: () => React.ReactElement; value: string }[];
}) {
  return (
    <div className="pdf-close-inner">
      <p className="pdf-eyebrow" style={{ fontFamily: "var(--pg-body)" }}>
        Come say hi
      </p>
      <h2 className="pdf-close-title" style={headStyle}>
        {store.name}
      </h2>
      {store.menuTagline && <p className="pdf-close-tag">{store.menuTagline}</p>}

      {contactBits.length > 0 && (
        <address className="pdf-address">
          {contactBits.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </address>
      )}

      {reachBits.length > 0 && (
        <div className="pdf-reach">
          {reachBits.map((r) => (
            <div key={r.label} className="pdf-reach-row">
              <span className="pdf-reach-icon">
                <r.icon />
              </span>
              <span className="pdf-reach-value">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {(store.openingTime || store.closingTime) && (
        <p className="pdf-hours">
          Open daily {store.openingTime}–{store.closingTime}
        </p>
      )}

      <p className="pdf-thanks" style={headStyle}>
        Thanks for stopping by.
      </p>

      <p className="pdf-wordmark">
        Menu by Fi<span style={{ color: "var(--pg-accent)" }}>zz</span>
        <span className="pdf-dot">●</span>
      </p>
    </div>
  );
}

// Printed diet marker: the Indian packaged-food symbol — dot inside a square,
// green for veg, red for non-veg. Sits before the item name.
function DietTag({ diet }: { diet: string | null }) {
  if (diet !== "veg" && diet !== "nonveg") return null;
  return (
    <span
      className="pdf-diet"
      data-diet={diet}
      aria-label={diet === "veg" ? "Veg" : "Non-Veg"}
    />
  );
}

function ItemRow({
  item,
  currency,
  variant,
  num,
  trimZeros = false,
}: {
  item: MenuCategoryWithItems["items"][number];
  currency: string;
  variant: MenuLayout["itemRow"];
  num?: number;
  trimZeros?: boolean;
}) {
  const hasVariants = item.variants.length > 0;
  // Base price always prints when set — variants are extras, not replacements.
  const showBase = Number(item.price) > 0;
  // ₹89.00 → ₹89 on printed one-pagers; keep paise when they exist.
  const price = (v: string) => {
    const s = formatMoney(v, currency);
    return trimZeros ? s.replace(/\.00\b/, "") : s;
  };

  return (
    <div className="pdf-item" data-row={variant}>
      <div className="pdf-item-main">
        <span className="pdf-item-name">
          {num !== undefined && (
            <span className="pdf-item-num">{String(num).padStart(2, "0")}</span>
          )}
          <DietTag diet={item.diet} />
          {item.name}
        </span>
        {variant === "leaders" && showBase && <span className="pdf-leader" />}
        {showBase && <span className="pdf-item-price">{price(item.price)}</span>}
      </div>
      {item.description && (
        <p className="pdf-item-desc">{item.description}</p>
      )}
      {hasVariants && (
        <ul className="pdf-variants">
          {item.variants.map((v) => (
            <li key={v.id} className="pdf-variant">
              <span className="pdf-variant-name">{v.name}</span>
              {variant === "leaders" && <span className="pdf-leader" />}
              <span className="pdf-item-price">{price(v.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Toolbar({
  schemeId,
  layoutId,
  packId,
  op,
  fs,
  hasBg,
  fold,
  onOpacity,
  onFontScale,
  onNavigate,
  onPng,
  busy,
}: {
  schemeId: string;
  layoutId: string;
  packId: string;
  op: number;
  fs: number;
  hasBg: boolean;
  fold: boolean;
  onOpacity: (v: number) => void;
  onFontScale: (v: number) => void;
  onNavigate: (next: {
    scheme?: string;
    layout?: string;
    pack?: string;
    fold?: boolean;
  }) => void;
  onPng: () => void;
  busy: boolean;
}) {
  return (
    <div className="menu-pdf-toolbar">
      <div className="menu-pdf-toolbar-inner">
        <Link href="/dashboard/menu" className="mpt-back">
          ← Menu
        </Link>

        <div className="mpt-groups">
          <div className="mpt-group">
            <span className="mpt-label">Color scheme</span>
            <div className="mpt-chips">
              {MENU_COLOR_SCHEMES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onNavigate({ scheme: s.id })}
                  aria-pressed={s.id === schemeId}
                  className={`mpt-chip${s.id === schemeId ? " is-active" : ""}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mpt-group">
            <span className="mpt-label">Layout</span>
            <div className="mpt-chips">
              {MENU_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onNavigate({ layout: l.id })}
                  aria-pressed={l.id === layoutId}
                  className={`mpt-chip${l.id === layoutId ? " is-active" : ""}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mpt-group">
            <span className="mpt-label">Background</span>
            <div className="mpt-chips">
              {MENU_BG_PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onNavigate({ pack: p.id })}
                  aria-pressed={p.id === packId}
                  className={`mpt-chip${p.id === packId ? " is-active" : ""}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mpt-group">
            <span className="mpt-label">Paper</span>
            <div className="mpt-chips">
              <button
                type="button"
                onClick={() => onNavigate({ fold: false })}
                aria-pressed={!fold}
                className={`mpt-chip${!fold ? " is-active" : ""}`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ fold: true })}
                aria-pressed={fold}
                className={`mpt-chip${fold ? " is-active" : ""}`}
              >
                A3 book fold
              </button>
            </div>
          </div>

          <div className="mpt-group">
            <span className="mpt-label">Font size · {fs}%</span>
            <input
              type="range"
              min={80}
              max={140}
              step={5}
              value={fs}
              onChange={(e) => onFontScale(Number(e.target.value))}
              className="mpt-range"
              aria-label="Menu font size"
            />
          </div>

          {hasBg && (
            <div className="mpt-group">
              <span className="mpt-label">BG opacity · {op}%</span>
              <input
                type="range"
                min={0}
                max={60}
                step={2}
                value={op}
                onChange={(e) => onOpacity(Number(e.target.value))}
                className="mpt-range"
                aria-label="Background opacity"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="mpt-print"
        >
          Print / Save PDF
        </button>

        <button
          type="button"
          onClick={onPng}
          disabled={busy}
          className="mpt-png"
        >
          {busy ? "Rendering…" : "Save PNG"}
        </button>
      </div>
    </div>
  );
}

// Plain CSS string — this route renders standalone (root layout only), so the
// printable surface owns its own styling rather than leaning on Tailwind utils.
const PRINT_CSS = `
.menu-pdf-root {
  background: #4a4a4a;
  min-height: 100vh;
  color: var(--pg-fg);
  font-family: var(--pg-body);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ----- Toolbar (screen only) ----- */
.menu-pdf-toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #0E1116;
  border-bottom: 1px solid #2A313C;
}
.menu-pdf-toolbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  flex-wrap: wrap;
  font-family: var(--font-inter), system-ui, sans-serif;
}
.mpt-back {
  color: #8A93A1;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.mpt-back:hover { color: #C6F432; }
.mpt-groups { display: flex; gap: 18px; flex-wrap: wrap; flex: 1; }
.mpt-group { display: flex; flex-direction: column; gap: 5px; }
.mpt-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #8A93A1;
}
.mpt-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.mpt-range {
  width: 120px;
  height: 4px;
  margin-top: 8px;
  accent-color: #C6F432;
  cursor: pointer;
}
.mpt-chip {
  border: 1px solid #2A313C;
  background: #1A1F28;
  color: #F4F1E9;
  border-radius: 9999px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.mpt-chip:hover { border-color: #C6F432; }
.mpt-chip.is-active {
  background: #C6F432;
  color: #0E1116;
  border-color: #C6F432;
}
.mpt-print {
  background: #C6F432;
  color: #0E1116;
  border: none;
  border-radius: 18px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.mpt-print:hover { filter: brightness(1.05); }
.mpt-png {
  background: none;
  border: 1px solid #2A313C;
  color: #F4F1E9;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.mpt-png:hover:not(:disabled) { border-color: #C6F432; color: #C6F432; }
.mpt-png:disabled { opacity: 0.6; cursor: default; }

/* ----- Page surface ----- */
.menu-pdf-pages {
  max-width: 794px; /* ~A4 width @96dpi */
  margin: 24px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.pdf-page {
  position: relative;
  overflow: hidden;
  background: var(--pg-bg);
  color: var(--pg-fg);
  box-sizing: border-box;
  padding: 64px 64px 72px;
  min-height: 1123px; /* ~A4 height @96dpi */
  box-shadow: 0 8px 40px rgba(0,0,0,0.35);
}

/* Faint watermark icons sit behind the content of each page. */
.menu-bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  color: var(--pg-accent);
  opacity: var(--pg-bg-opacity, 0.16);
  pointer-events: none;
}
.pdf-content { position: relative; z-index: 1; }

/* ----- Cover ----- */
.pdf-cover { display: flex; }
.pdf-cover .pdf-content,
.pdf-close .pdf-content { display: flex; flex-direction: column; flex: 1; }
.pdf-cover-inner { margin: auto 0; width: 100%; }
.pdf-cover[data-cover="centered"] .pdf-cover-inner { text-align: center; margin: auto; }
.pdf-cover[data-cover="band"] {
  border-top: 14px solid var(--pg-accent);
  border-bottom: 14px solid var(--pg-accent);
}
.pdf-eyebrow {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  color: var(--pg-accent);
}
.pdf-logo-body { max-height: 70px; max-width: 260px; margin: 8px 0 0; }
.pdf-logo { display: block; max-height: 140px; max-width: 340px; object-fit: contain; margin: 18px 0 0; }
.pdf-cover[data-cover="centered"] .pdf-logo { margin-left: auto; margin-right: auto; }
.pdf-cover-title {
  margin: 18px 0 0;
  font-size: 68px;
  font-weight: 700;
  line-height: 1.02;
  color: var(--pg-fg);
}
.pdf-cover[data-cover="editorial"] .pdf-cover-title { font-size: 92px; line-height: 0.95; }
.pdf-cover-bigrule {
  display: block;
  height: 8px;
  width: 120px;
  background: var(--pg-accent);
  margin: 28px 0 0;
}
.pdf-cover-tag {
  margin: 22px 0 0;
  font-size: 20px;
  color: var(--pg-muted);
  max-width: 30ch;
}
.pdf-cover[data-cover="centered"] .pdf-cover-tag { margin-left: auto; margin-right: auto; }
.pdf-cover-meta {
  margin: 14px 0 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pg-muted);
}

/* ----- Body ----- */
/* Menu listing scales with the font-size controller; headings/cover stay put. */
.pdf-body { font-size: calc(16px * var(--pg-scale, 1)); }
.pdf-body-head { margin-bottom: 36px; }
.pdf-body-title {
  margin: 8px 0 0;
  font-size: 34px;
  font-weight: 700;
  color: var(--pg-fg);
}
.pdf-empty { color: var(--pg-muted); font-size: 16px; }

.pdf-cat { margin-bottom: 34px; break-inside: auto; }
.pdf-cat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  break-after: avoid;
  margin-bottom: 14px;
}
.pdf-cat-icon { font-size: 2.4em; line-height: 1; }
.pdf-cat-name {
  margin: 0;
  font-size: 1.5em;
  font-weight: 700;
  color: var(--pg-fg);
  white-space: nowrap;
}
.pdf-cat-rule {
  flex: 1;
  height: 2px;
  background: var(--pg-accent);
  opacity: 0.9;
}

/* Density (layout-driven) tunes vertical rhythm. */
[data-density="cozy"] .pdf-cat { margin-bottom: 22px; }
[data-density="cozy"] .pdf-item { padding: 7px 0; }
[data-density="cozy"] .pdf-cat-head { margin-bottom: 10px; }
[data-density="airy"] .pdf-cat { margin-bottom: 48px; }
[data-density="airy"] .pdf-item { padding: 15px 0; }
[data-density="airy"] .pdf-cat-head { margin-bottom: 20px; }

.pdf-items { display: flex; flex-direction: column; }
.pdf-item {
  padding: 11px 0;
  border-bottom: 1px solid var(--pg-divider);
  break-inside: avoid;
}
.pdf-item-main { display: flex; align-items: baseline; gap: 10px; }
.pdf-item-name { font-size: 1em; font-weight: 600; color: var(--pg-fg); }
.pdf-diet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.8em;
  height: 0.8em;
  margin-right: 5px;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  vertical-align: middle;
  color: var(--pg-muted);
}
.pdf-diet::before {
  content: "";
  width: 0.42em;
  height: 0.42em;
  border-radius: 50%;
  background: currentColor;
}
.pdf-diet[data-diet="veg"] { color: #2E7D32; }
.pdf-diet[data-diet="nonveg"] { color: #B3261E; }
.pdf-item-price {
  font-family: var(--pg-head);
  font-size: 1em;
  font-weight: 700;
  color: var(--pg-accent);
  white-space: nowrap;
}
.pdf-item[data-row="split"] .pdf-item-main { justify-content: space-between; }
.pdf-item[data-row="stacked"] .pdf-item-main { display: block; }
.pdf-item[data-row="stacked"] .pdf-item-price { display: block; margin-top: 2px; font-size: 0.94em; }
.pdf-leader {
  flex: 1;
  border-bottom: 1.5px dotted var(--pg-muted);
  align-self: flex-end;
  margin-bottom: 4px;
  min-width: 18px;
}
.pdf-item-desc {
  margin: 4px 0 0;
  font-size: 0.8125em;
  line-height: 1.45;
  color: var(--pg-muted);
  max-width: 60ch;
}
.pdf-variants { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.pdf-variant { display: flex; align-items: baseline; gap: 10px; justify-content: space-between; }
.pdf-variant-name { font-size: 0.875em; color: var(--pg-muted); }

/* ----- Closing ----- */
.pdf-close { display: flex; }
.pdf-close-inner { margin: auto 0; width: 100%; }
.pdf-close-title { margin: 16px 0 0; font-size: 48px; font-weight: 700; color: var(--pg-fg); }
.pdf-close-tag { margin: 14px 0 0; font-size: 18px; color: var(--pg-muted); max-width: 36ch; }
.pdf-address {
  font-style: normal;
  margin: 36px 0 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 16px;
  color: var(--pg-fg);
}
.pdf-reach { margin: 24px 0 0; display: flex; flex-direction: column; gap: 8px; max-width: 360px; }
.pdf-reach-row {
  display: flex;
  justify-content: flex-start;
  gap: 16px;
  border-bottom: 1px solid var(--pg-divider);
  padding-bottom: 8px;
}
.pdf-reach-icon { color: var(--pg-accent); display: flex; align-items: center; }
.pdf-reach-value { font-size: 15px; color: var(--pg-fg); font-weight: 600; }
.pdf-hours { margin: 22px 0 0; font-size: 14px; color: var(--pg-muted); }
.pdf-thanks { margin: 48px 0 0; font-size: 26px; font-weight: 700; color: var(--pg-fg); }
.pdf-wordmark { margin: 10px 0 0; font-size: 14px; color: var(--pg-muted); font-weight: 700; font-family: var(--font-pixel), ui-monospace, monospace; }
.pdf-dot { color: var(--pg-accent); vertical-align: super; font-size: 9px; margin-left: 1px; }

/* ===== Creative layout extras ===== */

/* Newspaper columns for the body. Categories stay whole across the gap. */
.pdf-cats[data-cols="2"] { column-count: 2; column-gap: 40px; }
.pdf-cats[data-cols="2"] .pdf-cat { break-inside: avoid; }

/* ----- A3 book fold: landscape sheets, folded down the middle ----- */
/* A3 landscape @96dpi = 1587 x 1123px. Each half is an A4 portrait panel. */
.menu-pdf-root[data-fold] .menu-pdf-pages { max-width: 1587px; }
.menu-pdf-root[data-fold] .pdf-page {
  min-height: 1123px;
  padding: 54px 60px 60px;
}
/* The fold itself: a dashed guide down the centre, on screen and in print. */
.menu-pdf-root[data-fold] .pdf-page::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px dashed var(--pg-divider);
  z-index: 1;
  pointer-events: none;
}
.menu-pdf-root[data-fold] .pdf-sheet-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 110px;
  flex: 1;
}
.menu-pdf-root[data-fold] .pdf-panel { display: flex; flex-direction: column; justify-content: center; }
/* Inside spread: the body flows left column then right, reading across the fold. */
.menu-pdf-root[data-fold] .pdf-cats[data-cols="2"] { column-gap: 110px; }
.menu-pdf-root[data-fold] .pdf-cover-title { font-size: 54px; }
.menu-pdf-root[data-fold] .pdf-logo { max-height: 110px; }

/* Inset hairline frame on every page (framed layouts). */
.menu-pdf-root[data-frame="1"] .pdf-page::before {
  content: "";
  position: absolute;
  inset: 22px;
  border: 1.5px solid var(--pg-accent);
  z-index: 0;
  pointer-events: none;
}
.menu-pdf-root[data-dash="1"] .pdf-page::before { border-style: dashed; }
.menu-pdf-root[data-dash="1"] .pdf-item { border-bottom-style: dashed; }
.menu-pdf-root[data-dash="1"] .pdf-cat-rule { background: none; border-top: 2px dashed var(--pg-accent); height: 0; }

/* Running item number (receipt layout). */
.pdf-item-num {
  font-family: var(--pg-head);
  font-weight: 700;
  color: var(--pg-accent);
  margin-right: 8px;
  font-size: 0.85em;
}

/* Card rows: each item is a bordered tile. */
.pdf-item[data-row="card"] {
  border: 1.5px solid var(--pg-divider);
  border-radius: 14px;
  padding: 13px 15px;
  margin-bottom: 10px;
  break-inside: avoid;
}
.pdf-item[data-row="card"] .pdf-item-main { justify-content: space-between; }

/* Pill prices. */
.pdf-item[data-row="pill"] .pdf-item-main { justify-content: space-between; }
.pdf-item[data-row="pill"] .pdf-item-price,
.pdf-item[data-row="pill"] .pdf-variant .pdf-item-price {
  background: var(--pg-accent);
  color: var(--pg-accent-fg);
  padding: 2px 11px;
  border-radius: 9999px;
  font-size: 0.9em;
}

/* Cover: split — title behind an accent bar, left aligned. */
.pdf-cover[data-cover="split"] .pdf-cover-inner {
  border-left: 8px solid var(--pg-accent);
  padding-left: 30px;
}

/* Cover: poster — centered inside an accent frame. */
.pdf-cover[data-cover="poster"] .pdf-content {
  align-items: center;
  justify-content: center;
}
.pdf-cover[data-cover="poster"] .pdf-cover-inner {
  text-align: center;
  border: 3px solid var(--pg-accent);
  padding: 56px 40px;
  margin: auto;
}
.pdf-cover[data-cover="poster"] .pdf-cover-title { font-size: 80px; }
.pdf-cover[data-cover="poster"] .pdf-cover-tag { margin-left: auto; margin-right: auto; }

/* Cover: ticket — narrow dashed receipt card. */
.pdf-cover[data-cover="ticket"] .pdf-content {
  align-items: center;
  justify-content: center;
}
.pdf-cover[data-cover="ticket"] .pdf-cover-inner {
  max-width: 380px;
  margin: auto;
  text-align: center;
  border: 2px dashed var(--pg-divider);
  padding: 40px 32px;
}
.pdf-cover[data-cover="ticket"] .pdf-cover-title { font-size: 46px; }
.pdf-cover[data-cover="ticket"] .pdf-cover-tag { margin-left: auto; margin-right: auto; }

/* ===== Single-page (One-Pager) layout ===== */
/* Brand band on top, two-column body, contact strip pinned to the bottom. */
.menu-pdf-root[data-single] .pdf-body { display: flex; }
.menu-pdf-root[data-single] .pdf-body .pdf-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.menu-pdf-root[data-single] .pdf-cats { flex: 1; }
.pdf-brand-head { text-align: center; margin-bottom: 26px; }
.pdf-brand-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: var(--pg-accent);
  color: var(--pg-accent-fg);
  border-radius: 14px;
  padding: 12px 34px;
}
.pdf-brand-name { font-size: 30px; font-weight: 700; line-height: 1.1; }
.pdf-brand-logo { display: block; max-height: 46px; max-width: 220px; object-fit: contain; }
.pdf-brand-tag {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: none;
  opacity: 0.9;
}
.pdf-brand-title {
  margin: 10px 0 0;
  font-size: 40px;
  font-weight: 700;
  color: var(--pg-accent);
  letter-spacing: 0.06em;
}
/* Match the printed-flyer reference: hairline page frame, red uppercase
   category heads with no rule, undivided tight rows, dashed price prefix. */
.menu-pdf-root[data-single="onepage"] .pdf-page {
  border: 1.5px solid var(--pg-fg);
  padding: 34px 30px 26px;
}
.menu-pdf-root[data-single="onepage"] .pdf-cat-rule { display: none; }
.menu-pdf-root[data-single="onepage"] .pdf-cat-name {
  color: var(--pg-accent);
  font-size: 1.6em;
  letter-spacing: 0.02em;
}
.menu-pdf-root[data-single="onepage"] .pdf-cat-icon { font-size: 1.5em; }
.menu-pdf-root[data-single="onepage"] .pdf-cat-head { margin-bottom: 6px; }
.menu-pdf-root[data-single="onepage"] .pdf-item {
  border-bottom: none;
  padding: 3px 0;
}
.menu-pdf-root[data-single="onepage"] .pdf-item-name { font-weight: 700; }
.menu-pdf-root[data-single="onepage"] .pdf-item-price::before { content: "- "; }
.menu-pdf-root[data-single="onepage"] .pdf-variants { gap: 2px; margin-top: 2px; }

.pdf-strip-wrap { margin-top: 18px; }
.pdf-strip {
  background: var(--pg-accent);
  color: var(--pg-accent-fg);
  text-align: center;
  padding: 10px 16px;
  font-size: 18px;
  font-weight: 700;
}
.pdf-strip-reach-item { display: inline-flex; align-items: center; gap: 5px; }
.pdf-strip-reach-item + .pdf-strip-reach-item { margin-left: 18px; }
.pdf-strip-reach-item svg { color: var(--pg-accent); }
.pdf-strip-reach {
  margin: 10px 0 0;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--pg-fg);
}

/* Variant: One-Page Poster — single wide column, centered heads. */
.menu-pdf-root[data-single="onepage-poster"] .pdf-cat-head { justify-content: center; }
.menu-pdf-root[data-single="onepage-poster"] .pdf-items { max-width: 560px; margin: 0 auto; }

/* Variant: One-Page Ticket — dashed rules already come from the layout flag;
   just pull the rows tighter so a numbered list still fits one sheet. */
.menu-pdf-root[data-single="onepage-ticket"] .pdf-item { padding: 4px 0; }

/* Every one-pager: the page must not spill onto a second sheet. */
.menu-pdf-root[data-single] .pdf-cat { break-inside: avoid; }

/* ----- Print ----- */
/* Single-page presets set their own tighter page padding; folded sheets are
   A3, so restore the sheet padding when both apply. */
.menu-pdf-root[data-fold][data-single] .pdf-page { padding: 54px 60px 60px; }

@page { size: A4; margin: 0; }
@media print {
  .menu-pdf-toolbar { display: none !important; }
  .menu-pdf-root { background: var(--pg-bg) !important; }
  .menu-pdf-pages { max-width: none; margin: 0; gap: 0; }
  .pdf-page {
    box-shadow: none;
    min-height: 100vh;
    padding: 18mm 18mm 20mm;
    break-after: page;
  }
  .pdf-page:last-child { break-after: auto; }
}
`;
