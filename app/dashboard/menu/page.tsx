import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import { featureOn } from "@/lib/store/features";
import MenuPageClient from "@/components/fizz/menu/MenuPageClient";

export const metadata: Metadata = {
  title: "Menu — Fizz",
};

export default async function MenuPage() {
  const api = await trpc();
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") redirect("/dashboard");

  const store = await api.store.get();
  // Inventory off = no recipes; skip the reads (the recipe router refuses).
  const inventory = featureOn(store.disabledFeatures, "inventory");
  const [categories, combos, orderSettings, ingredients, recipes, hdrs] = await Promise.all([
    api.menu.full(),
    api.menu.combos(),
    api.menu.orderSettings(),
    inventory ? api.recipe.ingredients() : [],
    inventory ? api.recipe.byMenuItem() : {},
    headers(),
  ]);

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <MenuPageClient
      store={store}
      categories={categories}
      combos={combos}
      orderSettings={orderSettings}
      ingredients={ingredients}
      recipes={recipes}
      origin={origin}
    />
  );
}
