import { menuPath } from "@/lib/store/menu-path";
import { comboSummary, contrastOn, formatMoney } from "@/lib/store/format";
import { MenuCategoryIconGlyph } from "@/components/fizz/menu/category-icons";
import { AddToCart, FloatingCart } from "@/components/fizz/menu/PublicOrder";
import ComboRail from "@/components/fizz/menu/ComboRail";
import MenuSearch from "@/components/fizz/menu/MenuSearch";
import { getMenuTheme, themeVars } from "@/lib/store/menu-themes";
import type { ComboView, PublicMenu } from "@/lib/store/menu";

// Base font-size per scale; the rest of the layout uses em so it scales with it.
const SCALE_PX: Record<string, number> = { sm: 15, md: 17, lg: 19 };

// The menu itself. Rendered at /m/[slug]/menu, and at /m/[slug] when the
// welcome screen is off. `table` comes from ?t= on a table QR.
export default function PublicMenuView({
  slug,
  menu,
  viewOnly,
  table,
}: {
  slug: string;
  menu: PublicMenu;
  viewOnly?: string;
  table: string | null;
}) {
  const { store, categories, combos, ordering: cfg } = menu;
  const theme = getMenuTheme(store.menuTheme);
  // The store's own accent wins; the theme only suggests one at pick time.
  const accent = store.menuAccent || theme.accent;
  const basePx = SCALE_PX[store.menuFontScale] ?? SCALE_PX.md;
  // Ordering needs somewhere to send the order and at least one fulfilment
  // mode; without either it stays off.
  const modes = cfg
    ? ([
        cfg.dineIn && "Dine-in",
        cfg.takeaway && "Takeaway",
        cfg.delivery && "Delivery",
      ].filter(Boolean) as string[])
    : [];
  // ?viewOnly=1 forces the read-only menu — for QR prints, tablets on the
  // counter, and anywhere a guest shouldn't be able to fire off an order.
  const readOnly = viewOnly === "1" || viewOnly === "true";
  const ordering = !readOnly && !!cfg?.ordering && !!cfg.whatsapp && modes.length > 0;

  return (
    <main
      className="min-h-dvh bg-[var(--m-bg)] text-[var(--m-text)]"
      style={{ ...themeVars(theme, accent), fontSize: `${basePx}px` }}
    >
      <div className="mx-auto max-w-3xl px-6 pb-14 pt-[max(1.25rem,env(safe-area-inset-top))] lg:pb-20 lg:pt-12" style={{ paddingBottom: ordering ? "7rem" : undefined }}>
        {/* Compact header: logo/initial, name, tagline, one line of contact. */}
        <header className="flex items-center gap-4">
          {store.menuWelcome?.on ? (
            <a
              href={`${menuPath(slug)}${table ? `?t=${encodeURIComponent(table)}` : ""}`}
              aria-label="Back to welcome"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-text)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </a>
          ) : (
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-[var(--m-surface)] text-[1.2em] font-bold"
              style={{ borderColor: accent, fontFamily: theme.display, color: accent }}
            >
              {store.logoUrl ? (
                /* ponytail: plain <img> via /api/logo — the logo is an arbitrary
                   remote URL, so next/image would need a domain allowlist per store. */
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/logo?s=${store.id}`} alt={`${store.name} logo`} className="h-full w-full object-cover" />
              ) : (
                store.name.trim().charAt(0).toUpperCase()
              )}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.5em] font-bold leading-tight tracking-tight" style={{ fontFamily: theme.display }}>
              {store.name}
            </h1>
            <p className="truncate text-[0.85em] text-[var(--m-muted)]">
              {store.menuTagline ||
                [store.addressLine1, store.city].filter(Boolean).join(", ") ||
                "Menu"}
            </p>
          </div>
          {table && (
            <span
              className="shrink-0 rounded-full px-3 py-1.5 text-[0.7em] font-bold uppercase tracking-[0.16em] text-[var(--m-bg)]"
              style={{ backgroundColor: accent }}
            >
              Table {table}
            </span>
          )}
        </header>

        {categories.length > 0 && (
          <MenuSearch
            storeName={store.name}
            categories={[
              ...(combos.length > 0 ? [{ id: "combos", name: "Combos", icon: "🎁" }] : []),
              ...categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
            ]}
            whatsapp={cfg?.whatsapp}
            phone={store.phone}
            accent={accent}
            hasDiet={categories.some((c) => c.items.some((i) => i.diet === "veg" || i.diet === "nonveg"))}
          />
        )}

        {categories.length === 0 ? (
          <p className="mt-16 text-center text-[var(--m-muted)]">This menu is being plated. Check back soon.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-6">
            {combos.length > 0 && (
              <ComboSection
                combos={combos}
                currency={store.currency}
                accent={accent}
                display={theme.display}
                ordering={ordering}
              />
            )}
            {categories.map((cat) => (
              // Folded by default so the guest sees every category at a glance;
              // MenuSearch opens sections on search / chip tap.
              <details key={cat.id} data-cat={cat.id} className="group scroll-mt-32">
                <summary className="flex cursor-pointer list-none items-baseline gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="self-center" style={{ color: accent }}>
                    <MenuCategoryIconGlyph name={cat.icon} />
                  </span>
                  <h2
                    className="text-[1.35em] font-bold tracking-tight"
                    style={{ fontFamily: theme.display }}
                  >
                    {cat.name}
                  </h2>
                  <span className="text-[0.8em] text-[var(--m-muted)]">{cat.items.length}</span>
                  <svg viewBox="0 0 24 24" aria-hidden className="ml-auto h-5 w-5 self-center text-[var(--m-muted)] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <div className="mt-3 flex flex-col divide-y divide-[var(--m-line)]">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-4"
                      data-q={[cat.name, item.name, item.description, ...item.variants.map((v) => v.name)]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()}
                      data-diet={item.diet === "veg" || item.diet === "nonveg" ? item.diet : undefined}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <p className="text-[1.05em] font-semibold">
                            {/* Indian packaged-food diet symbol: dot in a square, before the name. */}
                            {(item.diet === "veg" || item.diet === "nonveg") && (
                              <span
                                aria-label={item.diet === "veg" ? "Veg" : "Non-Veg"}
                                className="mr-2 inline-flex h-[0.8em] w-[0.8em] items-center justify-center rounded-[2px] border-[1.5px] border-current align-middle"
                                style={{ color: item.diet === "veg" ? "#2E7D32" : "#B3261E" }}
                              >
                                <span className="h-[0.42em] w-[0.42em] rounded-full bg-current" />
                              </span>
                            )}
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="mt-1 text-[0.9em] text-[var(--m-muted)]">{item.description}</p>
                          )}
                        </div>
                        {/* Base price always shows when set — variants are extras, not replacements. */}
                        {Number(item.price) > 0 && (
                          <div className="flex shrink-0 items-center gap-3">
                            <span
                              className="text-[1.05em] font-semibold"
                              style={{ color: accent, fontFamily: theme.display }}
                            >
                              {formatMoney(item.price, store.currency)}
                            </span>
                            {ordering && (
                              <AddToCart
                                itemKey={item.id}
                                itemId={item.id}
                                variantId={null}
                                name={item.name}
                                price={item.price}
                                accent={accent}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      {/* Variants sit below the row, full width, so their prices land in the same right column. */}
                      {item.variants.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1">
                          {item.variants.map((v) => (
                            <li key={v.id} className="flex items-center justify-between gap-4 text-[0.9em] text-[var(--m-muted)]">
                              <span>{v.name}</span>
                              <span className="flex shrink-0 items-center gap-3">
                                <span style={{ color: accent }}>{formatMoney(v.price, store.currency)}</span>
                                {ordering && (
                                  <AddToCart
                                    itemKey={v.id}
                                    itemId={item.id}
                                    variantId={v.id}
                                    name={`${item.name} (${v.name})`}
                                    price={v.price}
                                    accent={accent}
                                  />
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}

        <footer className="mt-16 border-t border-[var(--m-line)] pt-6 text-center text-[0.8em] text-[var(--m-muted)]">
          {(store.addressLine1 || store.city || store.phone || store.instagram || store.website) && (
            <p className="mb-3">
              {[
                store.addressLine1,
                store.city,
                store.phone,
                store.instagram && `@${store.instagram.replace(/^@/, "")}`,
                store.website?.replace(/^https?:\/\//, ""),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          Menu by{" "}
          <span className="font-wordmark font-bold text-[var(--m-text)]">
            Fi<span style={{ color: accent }}>zz</span>
            <span className="align-super text-[0.7em]" style={{ color: accent }}>●</span>
          </span>
        </footer>
      </div>

      {ordering && (
        <FloatingCart
          slug={slug}
          storeName={store.name}
          whatsapp={cfg!.whatsapp!}
          currency={store.currency}
          accent={accent}
          modes={modes}
          deliveryFee={Number(cfg!.deliveryFee)}
          packagingFee={Number(cfg!.packagingFee)}
          upi={store.upiId ? { vpa: store.upiId, name: store.upiName } : null}
          table={table}
        />
      )}
    </main>
  );
}

// Scalloped left/right edges: round 5px bites every 14px, like a torn-off
// ticket. One radial bite per tile, tiled down each half of the box.
const TICKET_MASK =
  "radial-gradient(circle 5px at left, #0000 96%, #000) left/51% 14px repeat-y," +
  "radial-gradient(circle 5px at right, #0000 96%, #000) right/51% 14px repeat-y";

// Combos pinned above the menu: a row of ticket cards that drifts on a loop
// (ComboRail) and can be dragged. Copy reads like the counter talking ("X, Y &
// Z — yours for ₹N"); a faded coupon glyph sits behind the card.
function ComboSection({
  combos,
  currency,
  accent,
  display,
  ordering,
}: {
  combos: ComboView[];
  currency: string;
  accent: string;
  display: string;
  ordering: boolean;
}) {
  return (
    <section data-cat="combos" className="scroll-mt-32">
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="self-center" style={{ color: accent }}>🎁</span>
        <h2 className="text-[1.35em] font-bold tracking-tight" style={{ fontFamily: display }}>
          Combos
        </h2>
        <span className="text-[0.8em] text-[var(--m-muted)]">Hungry? Team up and save.</span>
      </div>
      <ComboRail className="-mx-6 mt-1">
        {/* Rendered three times (clone, original, clone) so the centred slider
            always has a neighbour each side; the clones are decoration.
            ponytail: the clones' buttons stay focusable — fine for a menu. */}
        {(combos.length > 1 ? [...combos, ...combos, ...combos] : combos).map((c, i) => {
          const clone = combos.length > 1 && (i < combos.length || i >= 2 * combos.length);
          const price = Number(c.price);
          const save = Math.round((c.worth - price) * 100) / 100;
          const pct = c.worth > 0 ? Math.round((save / c.worth) * 100) : 0;
          const parts = c.items.map((p) => comboSummary([p]));
          const said = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} & ${parts.at(-1)}` : parts[0];
          return (
            <article
              key={`${c.id}:${i}`}
              aria-hidden={clone || undefined}
              data-q={["combo", c.name, c.description, ...c.items.map((p) => p.name)]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()}
              className={`relative flex shrink-0 flex-col overflow-hidden px-5 py-4 transition-[opacity,scale] duration-500 data-[dim]:scale-[0.92] data-[dim]:opacity-40 ${
                combos.length > 1 ? "w-[74%] sm:w-[22em]" : "mx-6 w-[calc(100%-3rem)]"
              }`}
              // Ticket: accent layer = the outline, the surface layer inset 2px over it.
              style={{ backgroundColor: accent, mask: TICKET_MASK, WebkitMask: TICKET_MASK }}
            >
              <span aria-hidden className="absolute inset-[2px] bg-[var(--m-surface)]" style={{ mask: TICKET_MASK, WebkitMask: TICKET_MASK }} />
              {/* Shimmer: accent-tinted light streak sweeping across the ticket. */}
              <span aria-hidden className="fizz-sheen pointer-events-none absolute inset-0" style={{ color: accent }} />
              {/* Background coupon: big, tilted, desaturated — texture, not content. */}
              <span aria-hidden className="pointer-events-none absolute -bottom-4 -right-3 rotate-[-14deg] select-none text-[4.5em] leading-none opacity-[0.12] grayscale mix-blend-luminosity">
                🎟️
              </span>
              <div className="relative flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-[1.05em] font-bold leading-tight" style={{ fontFamily: display }}>
                  {c.name}
                </h3>
                {save > 0 && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.65em] font-bold uppercase tracking-[0.12em]"
                    style={{ backgroundColor: accent, color: contrastOn(accent) }}
                  >
                    -{pct >= 5 ? `${pct}%` : formatMoney(save, currency)}
                  </span>
                )}
              </div>
              {c.description && (
                <p className="relative mt-1 line-clamp-2 text-[0.85em] text-[var(--m-muted)]">{c.description}</p>
              )}
              {/* Never clipped: the guest has to see what's inside before adding. */}
              <p className="relative mb-3 mt-1 text-[0.85em] leading-snug">
                {said}
                {!c.description && <span className="text-[var(--m-muted)]"> — yours for one price.</span>}
              </p>
              {/* Perforation: the tear line between what you get and what you pay. */}
              <div className="relative mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed pt-3" style={{ borderColor: `${accent}55` }}>
                <span className="flex items-baseline gap-2">
                  <span className="text-[1.15em] font-bold" style={{ color: accent, fontFamily: display }}>
                    {formatMoney(price, currency)}
                  </span>
                  {save > 0 && (
                    <span className="text-[0.8em] text-[var(--m-muted)] line-through">
                      {formatMoney(c.worth, currency)}
                    </span>
                  )}
                </span>
                {ordering && (
                  <AddToCart
                    itemKey={`combo:${c.id}`}
                    itemId={c.id}
                    variantId={null}
                    combo
                    name={c.name}
                    price={price}
                    accent={accent}
                  />
                )}
              </div>
            </article>
          );
        })}
      </ComboRail>
    </section>
  );
}
