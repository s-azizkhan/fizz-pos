import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getAnalytics } from "@/lib/store/analytics";
import {
  fromDateInput,
  previousRange,
  rangeDays,
  resolvePreset,
  toDateInput,
  type DateRange,
  type RangePreset,
} from "@/lib/store/date-range";
import AnalyticsClient from "@/components/fizz/analytics/AnalyticsClient";

export const metadata: Metadata = { title: "Analytics — Fizz" };

const PRESETS: RangePreset[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const sp = await searchParams;
  const presetParam = (sp.range ?? "this_week") as RangePreset;
  const isCustom =
    presetParam === "custom" || (!!sp.from && !!sp.to && !PRESETS.includes(presetParam));

  let range: DateRange;
  let preset: RangePreset;
  if (isCustom && sp.from && sp.to) {
    const start = fromDateInput(sp.from);
    // Custom end is inclusive in the UI; make it exclusive by adding a day.
    const endInclusive = fromDateInput(sp.to);
    const end = new Date(endInclusive);
    end.setDate(end.getDate() + 1);
    range = { start, end: end > start ? end : new Date(start.getTime() + 86_400_000) };
    preset = "custom";
  } else {
    preset = PRESETS.includes(presetParam) ? presetParam : "this_week";
    range = resolvePreset(preset);
  }

  const prev = previousRange(range);
  // Use hourly buckets for single-day ranges, daily otherwise.
  const hourly = rangeDays(range) <= 1;

  const [store, analytics] = await Promise.all([
    getStore(),
    getAnalytics(range, prev, hourly),
  ]);

  return (
    <AnalyticsClient
      analytics={analytics}
      currency={store.currency}
      preset={preset}
      from={toDateInput(range.start)}
      // Show the inclusive end date in the UI.
      to={toDateInput(new Date(range.end.getTime() - 86_400_000))}
    />
  );
}
