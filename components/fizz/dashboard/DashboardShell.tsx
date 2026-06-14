"use client";

import Sidebar from "./Sidebar";
import { useUi } from "@/lib/store/ui";
import type { UserRole } from "@/lib/db/schema";

export default function DashboardShell({
  user,
  children,
}: {
  user: { name: string; role: UserRole };
  children: React.ReactNode;
}) {
  const { sidebarCollapsed, toggleMobileSidebar } = useUi();

  return (
    <div className="min-h-dvh">
      <Sidebar user={user} />

      <div
        className={`transition-[padding] duration-300 ease-out ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-line bg-ink/80 px-5 backdrop-blur lg:hidden">
          <button
            onClick={toggleMobileSidebar}
            aria-label="Open menu"
            className="rounded-fizz border border-ink-line p-2 text-cream"
          >
            ☰
          </button>
          <span className="font-display text-xl font-bold tracking-tight">
            Fi<span className="text-fizz">zz</span>
            <span className="align-super text-xs text-bubble">●</span>
          </span>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
