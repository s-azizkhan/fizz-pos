import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import MarginsClient from "@/components/fizz/margins/MarginsClient";

export const metadata: Metadata = { title: "Margins — Fizz" };

export default async function MarginsPage() {
  const api = await trpc();
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const [store, summary] = await Promise.all([api.store.get(), api.analytics.margins()]);
  return <MarginsClient summary={summary} currency={store.currency} />;
}
