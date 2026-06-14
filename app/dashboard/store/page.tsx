import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import StoreSettingsForm from "@/components/fizz/StoreSettingsForm";

export const metadata: Metadata = {
  title: "Store settings — Fizz",
};

export default async function StorePage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  const store = await getStore();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Admin
        </p>
        <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
          Store settings
        </h1>
        <p className="mt-3 max-w-[60ch] text-lg text-steam">
          Your café&apos;s details, hours, and how invoices and orders are
          numbered.
        </p>

      <div className="mt-10">
        <StoreSettingsForm store={store} />
      </div>
    </div>
  );
}
