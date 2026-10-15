import { menuPath } from "@/lib/store/menu-path";
import { formatMoney } from "@/lib/store/format";
import type { PublicMenu } from "@/lib/store/menu";
import { MenuCategoryIconGlyph } from "@/components/fizz/menu/category-icons";
import { AddToCart, FloatingCart } from "@/components/fizz/menu/PublicOrder";
import MenuSearch from "@/components/fizz/menu/MenuSearch";
import { getMenuTheme, themeVars } from "@/lib/store/menu-themes";

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
  const { store, categories, ordering: cfg } = menu;
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
            categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
            whatsapp={cfg?.whatsapp}
            phone={store.phone}
            accent={accent}
            hasDiet={categories.some((c) => c.items.some((i) => i.diet === "veg" || i.diet === "nonveg"))}
          />
        )}

        {categories.length === 0 ? (
          <p className="mt-16 text-center text-[var(--m-muted)]">This menu is being plated. Check back soon.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-10">
            {categories.map((cat) => (
              <section key={cat.id} data-cat={cat.id} className="scroll-mt-32">
                <div className="flex items-baseline gap-3">
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
                </div>
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
              </section>
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
