import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { getFullMenu } from "@/lib/store/menu";
import MenuManager from "@/components/fizz/menu/MenuManager";
import MenuAppearanceForm from "@/components/fizz/menu/MenuAppearanceForm";

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

  // Remount the manager when the server menu shape changes so optimistic local
  // state stays aligned with the source of truth after a revalidate.
  const shapeKey = categories
    .map((c) => `${c.id}:${c.items.map((i) => i.id).join(",")}`)
    .join("|");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Floor
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Menu
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Build your categories and items, reorder them, and publish a shareable
        public menu.
      </p>

      {user.role === "admin" && (
        <div className="mt-10">
          <MenuAppearanceForm store={store} origin={origin} />
        </div>
      )}

      <div className="mt-10">
        <MenuManager key={shapeKey} categories={categories} currency={store.currency} />
      </div>
    </div>
  );
}
