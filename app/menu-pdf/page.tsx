import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getFullMenu } from "@/lib/store/menu";
import PrintableMenu from "@/components/fizz/menu/PrintableMenu";
import { DEFAULT_MENU_COLOR_SCHEME } from "@/components/fizz/menu/print-styles";
import { DEFAULT_MENU_LAYOUT } from "@/components/fizz/menu/menu-layouts";
import { DEFAULT_MENU_BG_PACK } from "@/components/fizz/menu/bg-packs";

export const metadata: Metadata = {
  title: "Printable menu — Fizz",
};

// Standalone printable menu route. Lives outside /dashboard on purpose so it
// does NOT inherit the sidebar shell — the page is the document. Auth still
// enforced here (admin/manager), matching the menu page.
export default async function MenuPdfPage({
  searchParams,
}: {
  searchParams: Promise<{
    scheme?: string;
    layout?: string;
    pack?: string;
    op?: string;
    fs?: string;
    embed?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") redirect("/dashboard");

  const [store, categories, sp] = await Promise.all([
    getStore(),
    getFullMenu(),
    searchParams,
  ]);

  const clamp = (raw: string | undefined, def: number, lo: number, hi: number) => {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
  };
  const opacity = clamp(sp.op, 16, 0, 60);
  const fontScale = clamp(sp.fs, 100, 80, 140);

  // Only available items/categories belong on a printed menu.
  const printable = categories
    .filter((c) => c.available)
    .map((c) => ({ ...c, items: c.items.filter((i) => i.available) }))
    .filter((c) => c.items.length > 0);

  return (
    <PrintableMenu
      store={store}
      categories={printable}
      schemeId={sp.scheme ?? DEFAULT_MENU_COLOR_SCHEME}
      layoutId={sp.layout ?? DEFAULT_MENU_LAYOUT}
      packId={sp.pack ?? DEFAULT_MENU_BG_PACK}
      opacity={opacity}
      fontScale={fontScale}
      embed={sp.embed === "1"}
    />
  );
}
