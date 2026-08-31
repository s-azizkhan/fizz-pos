import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import MenuPageClient from "@/components/fizz/menu/MenuPageClient";

export const metadata: Metadata = {
  title: "Menu — Fizz",
};

export default async function MenuPage() {
  const api = await trpc();
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") redirect("/dashboard");

  const [store, categories, ingredients, recipes, hdrs] = await Promise.all([
    api.store.get(),
    api.menu.full(),
    api.recipe.ingredients(),
    api.recipe.byMenuItem(),
    headers(),
  ]);

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <MenuPageClient
      store={store}
      categories={categories}
      ingredients={ingredients}
      recipes={recipes}
      origin={origin}
    />
  );
}
