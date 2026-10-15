import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { trpc } from "@/lib/trpc/server";
import Games from "@/components/fizz/menu/Games";
import { getMenuTheme, themeVars } from "@/lib/store/menu-themes";
import { tableParam } from "@/lib/store/public-menu";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const menu = await (await trpc()).menu.public((await params).slug);
  return { title: menu ? `${menu.store.name} — Games` : "Menu not found" };
}

// /m/[slug]/games: two small games for the wait, painted in the menu theme.
export default async function GamesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ viewOnly?: string; t?: string; g?: string }>;
}) {
  const api = await trpc();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const menu = await api.menu.public(slug);
  if (!menu) notFound();
  const { store } = menu;
  const theme = getMenuTheme(store.menuTheme);
  const accent = store.menuAccent || theme.accent;
  const table = tableParam(sp.t);
  const qs = new URLSearchParams();
  if (table) qs.set("t", table);
  if (sp.viewOnly) qs.set("viewOnly", sp.viewOnly);
  const q = qs.size ? `?${qs}` : "";
  const game = sp.g?.trim() || null;
  // In a game, back goes to the list; on the list, back goes to the welcome screen.
  const back = game ? `/m/${slug}/games${q}` : `/m/${slug}${q}`;

  return (
    <main
      className="min-h-dvh overscroll-none bg-[var(--m-bg)] text-[var(--m-text)] [-webkit-tap-highlight-color:transparent]"
      style={themeVars(theme, accent)}
    >
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-lg">
        <div className="flex items-center justify-between">
          <a href={back} className="text-[14px] font-semibold text-[var(--m-muted)] hover:text-[var(--m-text)]">
            ← Back
          </a>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
            {store.name}
          </span>
        </div>
        {!game && (
          <>
            <h1 className="mt-3 text-[clamp(22px,6vw,28px)] font-bold tracking-tight" style={{ fontFamily: theme.display }}>
              While you wait
            </h1>
            <p className="mt-1 text-[14px] text-[var(--m-muted)]">Pick one. Best scores stay on this phone.</p>
          </>
        )}
        <Games accent={accent} game={game} base={`/m/${slug}/games`} query={Object.fromEntries(qs)} />
      </div>
    </main>
  );
}
