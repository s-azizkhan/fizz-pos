"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useUi } from "@/lib/store/ui";
import { navForRole } from "./nav-items";
import { ChevronIcon, LogoutIcon } from "./icons";
import type { UserRole } from "@/lib/db/schema";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Owner",
  manager: "Manager",
  staff: "Barista",
};

export default function Sidebar({
  user,
}: {
  user: { name: string; role: UserRole };
}) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } =
    useUi();
  const items = navForRole(user.role);
  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Mobile scrim */}
      {mobileSidebarOpen && (
        <button
          aria-label="Close menu"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-ink-line bg-ink-soft/60 backdrop-blur",
          "transition-[width,transform] duration-300 ease-out",
          collapsed ? "lg:w-20" : "lg:w-64",
          "w-64",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand + collapse toggle */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-ink-line px-5">
          <Link
            href="/dashboard"
            onClick={closeMobileSidebar}
            className="font-display text-2xl font-bold tracking-tight"
          >
            Fi<span className="text-fizz">zz</span>
            {!collapsed && (
              <span className="align-super text-xs text-bubble">●</span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="hidden rounded-fizz border border-ink-line p-1.5 text-steam transition-colors hover:text-cream lg:inline-flex"
          >
            <ChevronIcon
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
                title={collapsed ? item.label : undefined}
                className={[
                  "group flex items-center gap-3 rounded-fizz px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed ? "lg:justify-center" : "",
                  active
                    ? "bg-fizz/10 text-fizz"
                    : "text-steam hover:bg-ink-line/40 hover:text-cream",
                ].join(" ")}
              >
                <Icon className="shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-fizz" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-ink-line p-3">
          <div
            className={`mb-2 flex items-center gap-3 rounded-fizz px-3 py-2 ${collapsed ? "lg:justify-center" : ""}`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fizz font-display text-sm font-bold text-ink">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className={collapsed ? "lg:hidden" : ""}>
              <p className="truncate text-sm font-semibold text-cream">{user.name}</p>
              <p className="text-xs text-fizz">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={[
                "flex w-full items-center gap-3 rounded-fizz px-3 py-2.5 text-sm text-steam transition-colors hover:bg-ink-line/40 hover:text-cream",
                collapsed ? "lg:justify-center" : "",
              ].join(" ")}
            >
              <LogoutIcon className="shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
