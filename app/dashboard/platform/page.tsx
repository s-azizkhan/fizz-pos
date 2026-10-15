import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { trpc } from "@/lib/trpc/server";
import PlatformBoard from "@/components/fizz/platform/PlatformBoard";

export const metadata: Metadata = { title: "Platform — Fizz" };

// Fizz operators: every counter, who's waiting on a payment, flip plans.
export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) redirect("/dashboard");
  const stores = await (await trpc()).billing.stores();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Fizz operators</p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Every counter
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Payment requests first. Confirm once the money lands — the plan switches on the moment you do.
      </p>
      <div className="mt-10">
        <PlatformBoard stores={stores} />
      </div>
    </div>
  );
}
