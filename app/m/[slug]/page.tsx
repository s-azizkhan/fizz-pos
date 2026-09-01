import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { trpc } from "@/lib/trpc/server";
import { formatMoney } from "@/lib/store/format";
import { MenuCategoryIconGlyph } from "@/components/fizz/menu/category-icons";
import { AddToCart, FloatingCart } from "@/components/fizz/menu/PublicOrder";
import { getMenuTheme, themeVars } from "@/lib/store/menu-themes";

export const dynamic = "force-dynamic";

// Base font-size per scale; the rest of the layout uses em so it scales with it.
const SCALE_PX: Record<string, number> = { sm: 15, md: 17, lg: 19 };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = await (await trpc()).menu.public(slug);
  if (!menu) return { title: "Menu not found" };
  return {
    title: `${menu.store.name} — Menu`,
    description: menu.store.menuTagline ?? `The menu at ${menu.store.name}.`,
  };
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ viewOnly?: string }>;
}) {
  const api = await trpc();
  const [{ slug }, { viewOnly }] = await Promise.all([params, searchParams]);
  const menu = await api.menu.public(slug);
  if (!menu) notFound();

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
      <div className="mx-auto max-w-3xl px-6 pb-14 pt-14 lg:pb-20 lg:pt-20" style={{ paddingBottom: ordering ? "7rem" : undefined }}>
        {/* Branding header */}
        <header className="border-b border-[var(--m-line)] pb-8 text-center">
          <p
            className={`text-[0.7em] font-semibold uppercase ${theme.eyebrow === "wide" ? "tracking-[0.3em]" : "tracking-[0.06em]"}`
}
            style={{ color: accent }}
          >
            Menu
          </p>
          <h1
            className="mt-3 text-[2.4em] font-bold leading-tight tracking-tight"
            style={{ fontFamily: theme.display }}
          >
            {store.name}
          </h1>
          {store.menuTagline && (
            <p className="mt-3 text-[1.05em] text-[var(--m-muted)]">{store.menuTagline}</p>
          )}
          {(store.city || store.phone) && (
            <p className="mt-4 text-[0.85em] text-[var(--m-muted)]">
              {[store.addressLine1, store.city, store.phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </header>

        {categories.length === 0 ? (
          <p className="mt-16 text-center text-[var(--m-muted)]">This menu is being plated. Check back soon.</p>
        ) : (
          <div className="mt-12 flex flex-col gap-12">
            {categories.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-center gap-3">
                  <span style={{ color: accent }}>
                    <MenuCategoryIconGlyph name={cat.icon} />
                  </span>
                  <h2
                    className="text-[1.5em] font-bold tracking-tight"
                    style={{ fontFamily: theme.display }}
                  >
                    {cat.name}
                  </h2>
                </div>
                <div className="mt-5 flex flex-col divide-y divide-[var(--m-line)]">
                  {cat.items.map((item) => (
                    <div key={item.id} className="py-4">
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <p className="text-[1.05em] font-semibold">
                            {item.name}
                            {(item.diet === "veg" || item.diet === "nonveg") && (
                              <span
                                className="ml-2 text-[0.75em] font-semibold"
                                style={{ color: item.diet === "veg" ? "#2E7D32" : "#B3261E" }}
                              >
                                ({item.diet === "veg" ? "Veg" : "Non-Veg"})
                              </span>
                            )}
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
          Menu by{" "}
          <span className="font-wordmark font-bold text-[var(--m-text)]">
            Fi<span style={{ color: accent }}>zz</span>
            <span className="align-super text-[0.7em]" style={{ color: accent }}>●</span>
          </span>
        </footer>
      </div>

      {ordering && (
        <FloatingCart
          storeName={store.name}
          whatsapp={cfg!.whatsapp!}
          currency={store.currency}
          accent={accent}
          modes={modes}
          deliveryFee={Number(cfg!.deliveryFee)}
          packagingFee={Number(cfg!.packagingFee)}
        />
      )}
    </main>
  );
}
