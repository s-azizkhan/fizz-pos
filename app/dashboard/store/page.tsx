import type { Metadata } from "next";
import Link from "next/link";
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
    <main className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-2xl font-bold tracking-tight">
            Fi<span className="text-fizz">zz</span>
            <span className="align-super text-xs text-bubble">●</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-steam transition-colors hover:text-cream"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-16">
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
    </main>
  );
}
