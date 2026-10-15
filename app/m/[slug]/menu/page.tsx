import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { trpc } from "@/lib/trpc/server";
import PublicMenuView from "@/components/fizz/menu/PublicMenuView";
import { menuMetadata, tableParam, type PublicSearch } from "@/lib/store/public-menu";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return menuMetadata((await params).slug);
}

// /m/[slug]/menu: always the menu, even with the welcome screen on.
export default async function PublicMenuOnlyPage({
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
  return <PublicMenuView slug={slug} menu={menu} viewOnly={sp.viewOnly} table={tableParam(sp.t)} />;
}
