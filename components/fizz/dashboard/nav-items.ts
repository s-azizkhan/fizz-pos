import type { UserRole } from "@/lib/db/schema";
import { routeOff } from "@/lib/store/features";
import {
  GridIcon,
  PosIcon,
  ChefIcon,
  BoxIcon,
  MarginIcon,
  ReportIcon,
  PrinterIcon,
  GearIcon,
  UsersIcon,
  CashIcon,
  WalletIcon,
  MenuBookIcon,
  ReceiptIcon,
  TrendIcon,
  HelpIcon,
  ContactIcon,
} from "./icons";

export type NavItem = {
  label: string;
  href: string;
  icon: (p: { className?: string }) => React.ReactNode;
  roles: UserRole[];
  blurb: string;
  /** Fizz operators only (PLATFORM_ADMIN_EMAILS), on top of the role check. */
  platform?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: GridIcon, roles: ["admin", "manager", "staff"], blurb: "Your floor at a glance." },
  { label: "POS", href: "/dashboard/pos", icon: PosIcon, roles: ["admin", "manager", "staff"], blurb: "Ring orders, take payment." },
  { label: "KOT board", href: "/dashboard/kot", icon: ChefIcon, roles: ["admin", "manager", "staff"], blurb: "Live kitchen queue." },
  { label: "Orders", href: "/dashboard/orders", icon: ReceiptIcon, roles: ["admin", "manager", "staff"], blurb: "Open tabs and sales history." },
  { label: "Customers", href: "/dashboard/customers", icon: ContactIcon, roles: ["admin", "manager", "staff"], blurb: "Your regulars and what they order." },
  { label: "Menu", href: "/dashboard/menu", icon: MenuBookIcon, roles: ["admin", "manager"], blurb: "Build items, categories, public menu." },
  { label: "Daily sales", href: "/dashboard/sales", icon: CashIcon, roles: ["admin", "manager", "staff"], blurb: "Record the day's takings." },
  { label: "Expenses", href: "/dashboard/expenses", icon: WalletIcon, roles: ["admin", "manager", "staff"], blurb: "Track every cost." },
  { label: "Inventory", href: "/dashboard/inventory", icon: BoxIcon, roles: ["admin", "manager"], blurb: "Track every ingredient, live." },
  { label: "Margins", href: "/dashboard/margins", icon: MarginIcon, roles: ["admin", "manager"], blurb: "Real cost per cup, no guessing." },
  { label: "Analytics", href: "/dashboard/analytics", icon: TrendIcon, roles: ["admin", "manager"], blurb: "Sales trends and what's selling." },
  { label: "Daily report", href: "/dashboard/report", icon: ReportIcon, roles: ["admin", "manager"], blurb: "Today at a glance, with what to do." },
  { label: "Team", href: "/dashboard/team", icon: UsersIcon, roles: ["admin"], blurb: "Add staff, set permissions." },
  { label: "Printers", href: "/dashboard/printers", icon: PrinterIcon, roles: ["admin", "manager", "staff"], blurb: "Pair a Bluetooth or USB receipt printer." },
  { label: "Store settings", href: "/dashboard/store", icon: GearIcon, roles: ["admin"], blurb: "Profile, hours, invoice numbering." },
  { label: "Billing", href: "/dashboard/billing", icon: WalletIcon, roles: ["admin"], blurb: "Your plan, trial and payments." },
  { label: "Platform", href: "/dashboard/platform", icon: GridIcon, roles: ["admin", "manager", "staff"], blurb: "Every counter, plans, payment requests.", platform: true },
  { label: "Help & docs", href: "/dashboard/docs", icon: HelpIcon, roles: ["admin", "manager", "staff"], blurb: "How every page works, step by step." },
];

// `off` = the store's switched-off features; their pages drop out of every nav.
export function navForRole(role: UserRole, off: readonly string[] = [], platform = false): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role) && (!i.platform || platform) && !routeOff(off, i.href));
}
