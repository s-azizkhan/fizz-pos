// Optional parts of Fizz a café can switch off (Store settings → Features).
// Stored inverted as `store.disabledFeatures`, so anything added here later
// starts ON for every café. Core floor work — POS, Orders, Menu, Team, Store
// settings — is never optional. Client-safe: no server imports.
export const FEATURES = [
  { key: "kot", label: "KOT board", hint: "Kitchen queue. Off = orders go straight to Orders.", href: "/dashboard/kot" },
  { key: "publicMenu", label: "Public menu", hint: "Shareable menu link, QR and web orders.", href: null },
  { key: "customers", label: "Customers", hint: "Customer book and name/phone at the POS.", href: "/dashboard/customers" },
  { key: "dailySales", label: "Daily sales", hint: "Record the day's takings by hand.", href: "/dashboard/sales" },
  { key: "expenses", label: "Expenses", hint: "Track every cost.", href: "/dashboard/expenses" },
  { key: "inventory", label: "Inventory", hint: "Stock, recipes and auto-deduction on sale.", href: "/dashboard/inventory" },
  { key: "margins", label: "Margins", hint: "Cost per cup. Needs Inventory.", href: "/dashboard/margins", needs: "inventory" },
  { key: "analytics", label: "Analytics", hint: "Sales trends and what's selling.", href: "/dashboard/analytics" },
  { key: "report", label: "Daily report", hint: "Today at a glance, with what to do.", href: "/dashboard/report" },
  { key: "printers", label: "Printers", hint: "Bluetooth/USB printing and ticket design.", href: "/dashboard/printers" },
  { key: "docs", label: "Help & docs", hint: "The in-app guide.", href: "/dashboard/docs" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
export const FEATURE_KEYS = FEATURES.map((f) => f.key) as [FeatureKey, ...FeatureKey[]];

// A feature is on unless switched off — or something it needs is off.
export function featureOn(off: readonly string[], key: FeatureKey): boolean {
  if (off.includes(key)) return false;
  const f = FEATURES.find((x) => x.key === key);
  return !f || !("needs" in f) || featureOn(off, f.needs);
}

// Is this dashboard route hidden by a switched-off feature?
export function routeOff(off: readonly string[], href: string): boolean {
  return FEATURES.some((f) => f.href && href.startsWith(f.href) && !featureOn(off, f.key));
}
