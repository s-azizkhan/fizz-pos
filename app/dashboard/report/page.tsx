import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getDailyReport } from "@/lib/store/daily-report";
import DailyReportView from "@/components/fizz/report/DailyReportView";

export const metadata: Metadata = { title: "Daily report — Fizz" };

export default async function DailyReportPage() {
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const store = await getStore();
  const report = await getDailyReport(store.currency);

  return (
    <DailyReportView
      report={report}
      currency={store.currency}
      storeName={store.name}
    />
  );
}
