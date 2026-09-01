"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { navForRole } from "./nav-items";
import { LogoutIcon } from "./icons";
import type { UserRole } from "@/lib/db/schema";
import { useUi } from "@/lib/store/ui";
import { useSwipeDismiss } from "@/lib/use-swipe-dismiss";

// ponytail: first 4 role-visible items are the tabs, rest live in "More".
// Reorder nav-items if the priority changes — no separate tab config.
const TAB_COUNT = 4;

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export default function BottomNav({
  user,
}: {
  user: { name: string; role: UserRole };
}) {
  const pathname = usePathname();
  const { moreOpen, toggleMore, closeMore } = useUi();
  const trpc = useTRPC();
  const signOut = useMutation(
    trpc.auth.logout.mutationOptions({
      // Full navigation, not router.push: the session cookie is gone, so
      // re-run proxy.ts and drop every cached client payload.
      // assign(), not `location.href =`: the React Compiler rejects writing
      // to that property from a component.
      onSuccess: ({ redirectTo }) => location.assign(redirectTo),
    }),
  );
  const swipe = useSwipeDismiss(closeMore);
  const items = navForRole(user.role);
  const tabs = items.slice(0, TAB_COUNT);
  const rest = items.slice(TAB_COUNT);
  const moreActive = rest.some((i) => isActive(pathname, i.href));

  return (
    <>
      {/* More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            onClick={closeMore}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
          />
          <div
            {...swipe.handlers}
            style={swipe.style}
            className="fizz-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[24px] border-t border-ink-line bg-ink-soft pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <div className="sticky top-0 flex justify-center bg-ink-soft pb-2 pt-3">
              <span className="h-1.5 w-10 rounded-full bg-cream/25" />
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 pt-2">
              {rest.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMore}
                    transitionTypes={["nav-forward"]}
                    className={`flex flex-col items-center gap-2 rounded-fizz border p-4 text-center text-xs font-medium transition-colors ${
                      active
                        ? "border-fizz/40 bg-fizz/10 text-fizz"
                        : "border-ink-line bg-ink/40 text-cream"
                    }`}
                  >
                    <Icon className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-ink-line px-5 pt-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fizz font-display text-sm font-bold text-ink">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-cream">
                {user.name}
              </p>
              <form
          onSubmit={(e) => {
            e.preventDefault();
            signOut.mutate();
          }}
        >
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-fizz border border-ink-line px-4 py-2.5 text-sm text-steam"
                >
                  <LogoutIcon className="shrink-0" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating tab bar: a pill that hovers over the content, so the page
          reads edge-to-edge underneath it. The wrapper is click-through —
          only the pill itself takes taps. */}
      <nav
        style={{ viewTransitionName: "tab-bar" }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      >
        <div className="fizz-glass pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 rounded-full p-1.5">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMore}
              transitionTypes={[item.href === "/dashboard" ? "nav-back" : "nav-forward"]}
              className={`relative flex flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors ${
                active ? "text-fizz" : "text-steam"
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  style={{ viewTransitionName: "tab-pill" }}
                  className="absolute inset-0 rounded-full bg-fizz/12 ring-1 ring-inset ring-fizz/20"
                />
              )}
              <Icon className="relative shrink-0" />
              <span className="relative max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={toggleMore}
          aria-label="More"
          aria-expanded={moreOpen}
          className={`flex flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors ${
            moreOpen || moreActive ? "bg-fizz/12 text-fizz ring-1 ring-inset ring-fizz/20" : "text-steam"
          }`}
        >
          <span className="grid h-5 w-5 place-items-center text-lg leading-none">⋯</span>
          More
        </button>
        </div>
      </nav>
    </>
  );
}
