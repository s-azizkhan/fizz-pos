import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { loadStore } from "@/lib/store/data";
import OnboardingWizard from "@/components/fizz/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Set up your counter — Fizz",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  const store = await loadStore();
  if (store.onboardedAt) redirect("/dashboard");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-6 py-10 sm:py-16">
      <Link href="/" className="font-wordmark font-bold text-2xl">
        Fi<span className="text-fizz">zz</span>
        <span className="align-super text-xs text-bubble">●</span>
      </Link>
      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        First run
      </p>
      <h1 className="mt-3 max-w-[20ch] font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Set up <span className="text-fizz">{store.name}</span>
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Hi {user.name.split(" ")[0]}. Four quick steps — every one of these can
        change later in Store settings.
      </p>
      <div className="mt-10">
        <OnboardingWizard store={store} />
      </div>
    </main>
  );
}
