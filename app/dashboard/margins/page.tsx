import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getMargins } from "@/lib/store/margins";
import MarginsClient from "@/components/fizz/margins/MarginsClient";

export const metadata: Metadata = { title: "Margins — Fizz" };

export default async function MarginsPage() {
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const [store, summary] = await Promise.all([getStore(), getMargins()]);
  return <MarginsClient summary={summary} currency={store.currency} />;
}
