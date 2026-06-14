import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getFullMenu } from "@/lib/store/menu";
import MenuPageClient from "@/components/fizz/menu/MenuPageClient";

export const metadata: Metadata = {
  title: "Menu — Fizz",
};

export default async function MenuPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") redirect("/dashboard");

  const [store, categories, hdrs] = await Promise.all([
    getStore(),
    getFullMenu(),
    headers(),
  ]);

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <MenuPageClient store={store} categories={categories} origin={origin} />
  );
}
