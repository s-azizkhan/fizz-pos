import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/lib/store/menu";
import { formatMoney } from "@/lib/store/format";
import { MenuCategoryIconGlyph } from "@/components/fizz/menu/category-icons";

export const dynamic = "force-dynamic";

const FONT_FAMILY: Record<string, string> = {
  sans: "var(--font-inter), system-ui, sans-serif",
  display: "var(--font-space-grotesk), system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', ui-monospace, monospace",
};

// Base font-size per scale; the rest of the layout uses em so it scales with it.
const SCALE_PX: Record<string, number> = { sm: 15, md: 17, lg: 19 };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) return { title: "Menu not found" };
  return {
    title: `${menu.store.name} — Menu`,
    description: menu.store.menuTagline ?? `The menu at ${menu.store.name}.`,
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();

  const { store, categories } = menu;
  const accent = store.menuAccent || "#C6F432";
  const fontFamily = FONT_FAMILY[store.menuFont] ?? FONT_FAMILY.sans;
  const basePx = SCALE_PX[store.menuFontScale] ?? SCALE_PX.md;

  return (
    <main
      className="min-h-dvh bg-ink text-cream"
      style={{ fontFamily, fontSize: `${basePx}px` }}
    >
      <div className="mx-auto max-w-3xl px-6 py-14 lg:py-20">
        {/* Branding header */}
        <header className="border-b border-ink-line pb-8 text-center">
          <p
            className="text-[0.7em] font-semibold uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            Menu
          </p>
          <h1 className="mt-3 text-[2.4em] font-bold leading-tight tracking-tight">
            {store.name}
          </h1>
          {store.menuTagline && (
            <p className="mt-3 text-[1.05em] text-steam">{store.menuTagline}</p>
          )}
          {(store.city || store.phone) && (
            <p className="mt-4 text-[0.85em] text-steam">
              {[store.addressLine1, store.city, store.phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </header>

        {categories.length === 0 ? (
          <p className="mt-16 text-center text-steam">This menu is being plated. Check back soon.</p>
        ) : (
          <div className="mt-12 flex flex-col gap-12">
            {categories.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-center gap-3">
                  <span style={{ color: accent }}>
                    <MenuCategoryIconGlyph name={cat.icon} />
                  </span>
                  <h2 className="text-[1.5em] font-bold tracking-tight">{cat.name}</h2>
                </div>
                <div className="mt-5 flex flex-col divide-y divide-ink-line/70">
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-6 py-4">
                      <div className="min-w-0">
                        <p className="text-[1.05em] font-semibold">{item.name}</p>
                        {item.description && (
                          <p className="mt-1 text-[0.9em] text-steam">{item.description}</p>
                        )}
                        {item.variants.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-1">
                            {item.variants.map((v) => (
                              <li key={v.id} className="flex justify-between gap-4 text-[0.9em] text-steam">
                                <span>{v.name}</span>
                                <span style={{ color: accent }}>{formatMoney(v.price, store.currency)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {item.variants.length === 0 && (
                        <span className="shrink-0 text-[1.05em] font-semibold" style={{ color: accent }}>
                          {formatMoney(item.price, store.currency)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-16 border-t border-ink-line pt-6 text-center text-[0.8em] text-steam">
          Menu by{" "}
          <span className="font-semibold text-cream">
            Fi<span style={{ color: accent }}>zz</span>
            <span className="align-super text-[0.7em]" style={{ color: accent }}>●</span>
          </span>
        </footer>
      </div>
    </main>
  );
}
