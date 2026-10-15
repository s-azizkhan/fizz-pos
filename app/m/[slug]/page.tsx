import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { trpc } from "@/lib/trpc/server";
import PublicMenuView from "@/components/fizz/menu/PublicMenuView";
import Welcome from "@/components/fizz/menu/Welcome";
import { menuMetadata, tableParam, type PublicSearch } from "@/lib/store/public-menu";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return menuMetadata((await params).slug);
}

// /m/[slug]: the welcome screen when it's on, else straight to the menu.
export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: PublicSearch;
}) {
  const api = await trpc();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const menu = await api.menu.public(slug);
  if (!menu) notFound();
  const table = tableParam(sp.t);
  if (menu.store.menuWelcome?.on) {
    return (
      <Welcome slug={slug} store={menu.store} whatsapp={menu.ordering?.whatsapp ?? null} table={table} viewOnly={sp.viewOnly} />
    );
  }
  return <PublicMenuView slug={slug} menu={menu} viewOnly={sp.viewOnly} table={table} />;
}
