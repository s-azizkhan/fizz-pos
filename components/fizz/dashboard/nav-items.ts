import type { UserRole } from "@/lib/db/schema";
import {
  GridIcon,
  CupIcon,
  BoxIcon,
  ChartIcon,
  GearIcon,
  UsersIcon,
  CashIcon,
  WalletIcon,
  MenuBookIcon,
  ReceiptIcon,
} from "./icons";

export type NavItem = {
  label: string;
  href: string;
  icon: (p: { className?: string }) => React.ReactNode;
  roles: UserRole[];
  blurb: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: GridIcon, roles: ["admin", "manager", "staff"], blurb: "Your floor at a glance." },
  { label: "Till", href: "/dashboard/till", icon: CupIcon, roles: ["admin", "manager", "staff"], blurb: "Ring orders, take payment." },
  { label: "Orders", href: "/dashboard/orders", icon: ReceiptIcon, roles: ["admin", "manager", "staff"], blurb: "Open tabs and sales history." },
  { label: "Menu", href: "/dashboard/menu", icon: MenuBookIcon, roles: ["admin", "manager"], blurb: "Build items, categories, public menu." },
  { label: "Daily sales", href: "/dashboard/sales", icon: CashIcon, roles: ["admin", "manager", "staff"], blurb: "Record the day's takings." },
  { label: "Expenses", href: "/dashboard/expenses", icon: WalletIcon, roles: ["admin", "manager", "staff"], blurb: "Track every cost." },
  { label: "Inventory", href: "/dashboard/inventory", icon: BoxIcon, roles: ["admin", "manager"], blurb: "Track every ingredient, live." },
  { label: "Margins", href: "/dashboard/margins", icon: ChartIcon, roles: ["admin", "manager"], blurb: "Real cost per cup, no guessing." },
  { label: "Team", href: "/dashboard/team", icon: UsersIcon, roles: ["admin"], blurb: "Add staff, set permissions." },
  { label: "Store settings", href: "/dashboard/store", icon: GearIcon, roles: ["admin"], blurb: "Profile, hours, invoice numbering." },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}
