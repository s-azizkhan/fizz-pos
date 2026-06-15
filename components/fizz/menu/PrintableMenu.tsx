"use client";

import { useState } from "react";
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
import type { Store } from "@/lib/db/schema";

// Self-contained printable menu. Renders a cover page, the category sections
// (page-break aware), and a closing/contact page. Browser print ("Save as PDF")
// is the export path — true WYSIWYG, no extra deps. `embed` hides the toolbar
// so the same route can be dropped into a preview iframe.
export default function PrintableMenu({
  store,
  categories,
  schemeId,
  layoutId,
  packId,
  opacity,
  fontScale,
  embed = false,
}: {
  store: Store;
  categories: MenuCategoryWithItems[];
  schemeId: string; // color scheme (palette + type)
  layoutId: string; // appearance / layout
  packId: string;
  opacity: number; // background watermark opacity, %
  fontScale: number; // menu body font size, %
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

  const contactBits = [
    [store.addressLine1, store.addressLine2].filter(Boolean).join(", "),
    [store.city, store.state, store.postalCode].filter(Boolean).join(" "),
    store.country,
  ].filter(Boolean);

  const reachBits = [
    store.phone && { label: "Call", value: store.phone },
    store.email && { label: "Email", value: store.email },
    store.menuSlug &&
      store.menuPublished && {
        label: "Online",
        value: `/m/${store.menuSlug}`,
      },
  ].filter(Boolean) as { label: string; value: string }[];

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
  }) =>
    router.replace(
      `/menu-pdf?scheme=${next.scheme ?? scheme.id}` +
        `&layout=${next.layout ?? layout.id}` +
        `&pack=${next.pack ?? pack.id}&op=${op}&fs=${fs}`,
      { scroll: false },
    );

  return (
    <div
      className="menu-pdf-root"
      style={vars}
      data-density={layout.density}
      data-frame={layout.framed ? "1" : undefined}
      data-dash={layout.dashed ? "1" : undefined}
    >
      <style>{PRINT_CSS}</style>

      {!embed && (
        <Toolbar
          schemeId={scheme.id}
          layoutId={layout.id}
          packId={pack.id}
          op={op}
          fs={fs}
          hasBg={pack.glyphs.length > 0}
          onOpacity={setOp}
          onFontScale={setFs}
          onNavigate={navigate}
        />
      )}

      <div className="menu-pdf-pages">
        {/* ---- COVER ---- */}
        <section className="pdf-page pdf-cover" data-cover={layout.cover}>
          <MenuBgLayer pack={pack} seed={0} />
          <div className="pdf-content">
            <Cover store={store} layout={layout} headStyle={headStyle} />
          </div>
        </section>

        {/* ---- MENU BODY ---- */}
        <section className="pdf-page pdf-body">
          <MenuBgLayer pack={pack} seed={2} />
          <div className="pdf-content">
          <div className="pdf-body-head">
            <span className="pdf-eyebrow" style={{ fontFamily: "var(--pg-body)" }}>
              Menu
            </span>
            <h2 className="pdf-body-title" style={headStyle}>
              {store.name}
            </h2>
          </div>

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
          </div>
        </section>

        {/* ---- CLOSING / CONTACT ---- */}
        <section className="pdf-page pdf-close">
          <MenuBgLayer pack={pack} seed={4} />
          <div className="pdf-content">
          <div className="pdf-close-inner">
            <p className="pdf-eyebrow" style={{ fontFamily: "var(--pg-body)" }}>
              Come say hi
            </p>
            <h2 className="pdf-close-title" style={headStyle}>
              {store.name}
            </h2>
            {store.menuTagline && (
              <p className="pdf-close-tag">{store.menuTagline}</p>
            )}

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
                    <span className="pdf-reach-label">{r.label}</span>
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
          </div>
        </section>
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
      <h1 className="pdf-cover-title" style={headStyle}>
        {store.name}
      </h1>
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

function ItemRow({
  item,
  currency,
  variant,
  num,
}: {
  item: MenuCategoryWithItems["items"][number];
  currency: string;
  variant: MenuLayout["itemRow"];
  num?: number;
}) {
  const hasVariants = item.variants.length > 0;

  return (
    <div className="pdf-item" data-row={variant}>
      <div className="pdf-item-main">
        <span className="pdf-item-name">
          {num !== undefined && (
            <span className="pdf-item-num">{String(num).padStart(2, "0")}</span>
          )}
          {item.name}
        </span>
        {variant === "leaders" && !hasVariants && <span className="pdf-leader" />}
        {!hasVariants && (
          <span className="pdf-item-price">
            {formatMoney(item.price, currency)}
          </span>
        )}
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
              <span className="pdf-item-price">
                {formatMoney(v.price, currency)}
              </span>
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
  onOpacity,
  onFontScale,
  onNavigate,
}: {
  schemeId: string;
  layoutId: string;
  packId: string;
  op: number;
  fs: number;
  hasBg: boolean;
  onOpacity: (v: number) => void;
  onFontScale: (v: number) => void;
  onNavigate: (next: { scheme?: string; layout?: string; pack?: string }) => void;
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
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--pg-divider);
  padding-bottom: 8px;
}
.pdf-reach-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--pg-accent);
  font-weight: 700;
  align-self: center;
}
.pdf-reach-value { font-size: 15px; color: var(--pg-fg); font-weight: 600; }
.pdf-hours { margin: 22px 0 0; font-size: 14px; color: var(--pg-muted); }
.pdf-thanks { margin: 48px 0 0; font-size: 26px; font-weight: 700; color: var(--pg-fg); }
.pdf-wordmark { margin: 10px 0 0; font-size: 14px; color: var(--pg-muted); font-weight: 600; }
.pdf-dot { color: var(--pg-accent); vertical-align: super; font-size: 9px; margin-left: 1px; }

/* ===== Creative layout extras ===== */

/* Newspaper columns for the body. Categories stay whole across the gap. */
.pdf-cats[data-cols="2"] { column-count: 2; column-gap: 40px; }
.pdf-cats[data-cols="2"] .pdf-cat { break-inside: avoid; }

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

/* ----- Print ----- */
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
