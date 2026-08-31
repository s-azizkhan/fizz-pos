import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import DailyReportView from "@/components/fizz/report/DailyReportView";

export const metadata: Metadata = { title: "Daily report — Fizz" };

export default async function DailyReportPage() {
  const api = await trpc();
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const store = await api.store.get();
  const report = await api.analytics.dailyReport(store.currency);

  return (
    <DailyReportView
      report={report}
      currency={store.currency}
      storeName={store.name}
    />
  );
}
