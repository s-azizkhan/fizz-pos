import type { Metadata } from "next";
import Link from "next/link";
import Bubbles from "@/components/fizz/Bubbles";
import SignupForm from "@/components/fizz/onboarding/SignupForm";

export const metadata: Metadata = {
  title: "Open your counter — Fizz",
  description: "Create the owner account for your Fizz counter.",
};

const Wordmark = ({ className }: { className?: string }) => (
  <Link href="/" className={`font-wordmark font-bold ${className ?? ""}`}>
    Fi<span className="text-fizz">zz</span>
    <span className="align-super text-xs text-bubble">●</span>
  </Link>
);

export default function SignupPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-ink-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Bubbles />
        <Wordmark className="relative z-10 text-3xl" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          The Counter Operating System
          </p>
          <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight">
          First cup&apos;s <span className="text-fizz">yours</span>.
          </h2>
          <p className="mt-4 max-w-[48ch] text-steam">
          You own this counter. Name it, set a password, and we&apos;ll walk
          you through tax, hours and features in two minutes.
          </p>
        </div>
        <p className="relative z-10 text-sm text-steam">
          Fast. Sharp. Effervescent. Honest.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Wordmark className="mb-10 inline-block text-2xl lg:hidden" />

          <h1 className="font-display text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
            Open your counter
          </h1>
          <p className="mt-2 text-steam">
            This account owns everything — team, settings, the books.
          </p>
          <div className="mt-8">
            <SignupForm />
          </div>
          <p className="mt-8 text-sm text-steam">
            Already set up?{" "}
            <Link href="/login" className="font-semibold text-fizz hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
