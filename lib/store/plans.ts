// Plans: what a counter gets for what it pays. Client-safe (no server imports).
// Prices are INR paise. Feature keys come from lib/store/features.ts; a
// feature missing from a plan is LOCKED — forced off on top of the café's own
// switches (see withPlan in lib/store/data.ts).
import { FEATURE_KEYS, type FeatureKey } from "@/lib/store/features";

export type PlanKey = "free" | "pro" | "counter";
export type Period = "month" | "year";

export const PLANS: {
  key: PlanKey;
  name: string;
  tagline: string;
  price: Record<Period, number>;
  /** Max team members incl. the owner; null = unlimited. */
  team: number | null;
  /** May serve the public menu on the café's own domain. */
  domain: boolean;
  features: readonly FeatureKey[] | "all";
}[] = [
  {
    key: "free",
    name: "Chai",
    tagline: "Billing, orders, QR menu. Free for one.",
    price: { month: 0, year: 0 },
    team: 1,
    domain: false,
    features: ["kot", "publicMenu", "customers", "dailySales", "printers", "docs"],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "Know your real margin. Team of five.",
    price: { month: 49900, year: 499000 },
    team: 5,
    domain: false,
    features: "all",
  },
  {
    key: "counter",
    name: "Counter",
    tagline: "Your own domain, unlimited team.",
    price: { month: 99900, year: 999000 },
    team: null,
    domain: true,
    features: "all",
  },
];

export const TRIAL_DAYS = 14;
export const PLAN_KEYS = PLANS.map((p) => p.key) as [PlanKey, ...PlanKey[]];
export const planByKey = (key: PlanKey) => PLANS.find((p) => p.key === key) ?? PLANS[0];

// Features a plan does NOT include.
export function planLocks(key: PlanKey): FeatureKey[] {
  const p = planByKey(key);
  return p.features === "all" ? [] : FEATURE_KEYS.filter((k) => !p.features.includes(k));
}

export type PlanStatus = {
  plan: PlanKey;
  /** True while running on the signup trial (Pro features, nothing paid). */
  trial: boolean;
  /** When the current paid period / trial ends; null on the free plan. */
  until: Date | null;
  /** The paid plan on the row, even if it has lapsed (for "renew" copy). */
  lapsed: PlanKey | null;
};

// What a store is entitled to right now: a live paid plan wins, then the
// trial, then free. Pure, so the cached store row never goes stale on expiry.
export function planStatus(
  s: { plan: string; planExpiresAt: Date | null; trialEndsAt: Date | null },
  now = new Date(),
): PlanStatus {
  const paid = PLAN_KEYS.includes(s.plan as PlanKey) && s.plan !== "free" ? (s.plan as PlanKey) : null;
  if (paid && s.planExpiresAt && s.planExpiresAt > now) return { plan: paid, trial: false, until: s.planExpiresAt, lapsed: null };
  if (s.trialEndsAt && s.trialEndsAt > now) return { plan: "pro", trial: true, until: s.trialEndsAt, lapsed: paid };
  return { plan: "free", trial: false, until: null, lapsed: paid };
}

export const formatPaise = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
