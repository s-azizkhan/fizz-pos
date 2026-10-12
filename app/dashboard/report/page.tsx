import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import DailyReportView from "@/components/fizz/report/DailyReportView";

export const metadata: Metadata = { title: "Daily report — Fizz" };

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const api = await trpc();
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const store = await api.store.get();
  const { date } = await searchParams;
  const report = await api.analytics.dailyReport({
    currency: store.currency,
    // Ignore malformed params rather than 500 on a bad URL.
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
  });

  return (
    <DailyReportView
      report={report}
      currency={store.currency}
      storeName={store.name}
    />
  );
}
