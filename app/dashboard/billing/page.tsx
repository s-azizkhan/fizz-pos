import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import BillingPanel from "@/components/fizz/billing/BillingPanel";

export const metadata: Metadata = { title: "Billing — Fizz" };

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  const status = await (await trpc()).billing.status();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Admin</p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Plan &amp; billing
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Pay for what the counter uses. Switch, renew or stop any time — no contract.
      </p>
      <div className="mt-10">
        <BillingPanel status={status} />
      </div>
    </div>
  );
}
