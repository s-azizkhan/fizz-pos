import type { Metadata } from "next";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/dal";
import type { UserRole } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Dashboard — Fizz",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Owner",
  manager: "Manager",
  staff: "Barista",
};

// What each role gets to touch. admin sees all; manager loses owner-only tiles;
// staff sees the till only.
const TILES: { title: string; blurb: string; roles: UserRole[] }[] = [
  { title: "Till", blurb: "Ring orders, take payment.", roles: ["admin", "manager", "staff"] },
  { title: "Inventory", blurb: "Track every ingredient, live.", roles: ["admin", "manager"] },
  { title: "Margins", blurb: "Real cost per cup, no guessing.", roles: ["admin", "manager"] },
  { title: "Team & roles", blurb: "Add staff, set permissions.", roles: ["admin"] },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const tiles = TILES.filter((t) => t.roles.includes(user.role));

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-2xl font-bold tracking-tight">
            Fi<span className="text-fizz">zz</span>
            <span className="align-super text-xs text-bubble">●</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-steam sm:inline">
              {user.name}
            </span>
            <span className="rounded-full border border-fizz/40 bg-fizz/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fizz">
              {ROLE_LABEL[user.role]}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-ink-line bg-ink-soft px-4 py-2 text-sm text-steam transition-colors hover:text-cream"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          {ROLE_LABEL[user.role]} view
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,5vw,48px)] font-bold tracking-tight">
          Morning, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-3 max-w-[60ch] text-lg text-steam">
          The floor&apos;s yours. Here&apos;s what you can run today.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <div
              key={t.title}
              className="rounded-fizz border border-ink-line bg-ink-soft p-7 transition-transform hover:scale-[1.02]"
            >
              <h2 className="font-display text-xl font-bold tracking-tight">
                {t.title}
              </h2>
              <p className="mt-2 text-sm text-steam">{t.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
