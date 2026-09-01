"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import { NAV_ITEMS } from "./nav-items";
import type { UserRole } from "@/lib/db/schema";

export default function DashboardShell({
  user,
  children,
}: {
  user: { name: string; role: UserRole };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The till sizes itself to the viewport and scrolls internally, so it takes
  // no bottom padding — the floating tab bar still shows over it.
  const fullBleed = pathname.startsWith("/dashboard/till");

  const current = NAV_ITEMS.filter((i) => i.href !== "/dashboard").find((i) =>
    pathname.startsWith(i.href),
  );

  return (
    <div className="min-h-dvh">
      <div>
        {/* Top bar: page title, with a back-to-home tap on subpages.
            Named so it stays anchored while the content slides underneath. */}
        <header
          style={{ viewTransitionName: "app-bar" }}
          className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-line bg-ink/80 px-4 backdrop-blur"
        >
          {current ? (
            <>
              <Link
                href="/dashboard"
                transitionTypes={["nav-back"]}
                aria-label="Back to dashboard"
                className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-fizz text-xl text-steam"
              >
                ‹
              </Link>
              <h1 className="truncate font-display text-lg font-bold tracking-tight">
                {current.label}
              </h1>
            </>
          ) : (
            <span className="font-wordmark font-bold text-xl">
              Fi<span className="text-fizz">zz</span>
              <span className="align-super text-xs text-bubble">●</span>
            </span>
          )}
        </header>

        {/* Bottom padding clears the floating tab bar (+ iOS home indicator). */}
        <main
          className={
            fullBleed ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
          }
        >
          {/* Content slides left going deeper, right coming back. Untyped
              navigations (initial load, browser back) get no animation. */}
          <ViewTransition
            enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
            exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
            default="none"
          >
            {children}
          </ViewTransition>
        </main>
      </div>

      <BottomNav user={user} />
    </div>
  );
}
