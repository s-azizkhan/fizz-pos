import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getHomeSnapshot } from "@/lib/store/home";
import { navForRole } from "@/components/fizz/dashboard/nav-items";
import DashboardHome from "@/components/fizz/dashboard/DashboardHome";
import type { UserRole } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Dashboard — Fizz" };

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Owner",
  manager: "Manager",
  staff: "Barista",
};

// Is the store currently open, given HH:MM open/close (handles overnight).
function isOpenNow(open: string, close: string): boolean {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const o = oh * 60 + om;
  const c = ch * 60 + cm;
  return c >= o ? mins >= o && mins < c : mins >= o || mins < c;
}

export default async function DashboardPage() {
  const [user, store, snapshot] = await Promise.all([
    getCurrentUser(),
    getStore(),
    getHomeSnapshot(),
  ]);

  // Managers/owners see insight panels; staff get a floor-focused view.
  const canSeeInsights = user.role === "admin" || user.role === "manager";
  const quickActions = navForRole(user.role).filter(
    (i) => i.href !== "/dashboard",
  );

  return (
    <DashboardHome
      firstName={user.name.split(" ")[0]}
      roleLabel={ROLE_LABEL[user.role]}
      storeName={store.name}
      currency={store.currency}
      openNow={isOpenNow(store.openingTime, store.closingTime)}
      openingTime={store.openingTime}
      closingTime={store.closingTime}
      canSeeInsights={canSeeInsights}
      snapshot={snapshot}
      quickActions={quickActions.map((a) => ({
        label: a.label,
        href: a.href,
        blurb: a.blurb,
      }))}
    />
  );
}
