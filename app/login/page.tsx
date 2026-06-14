import type { Metadata } from "next";
import Link from "next/link";
import Bubbles from "@/components/fizz/Bubbles";
import LoginForm from "@/components/fizz/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Fizz",
  description: "Sign in to the Fizz café operating system.",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — the effervescent welcome. Hidden on small screens. */}
      <section className="relative hidden overflow-hidden border-r border-ink-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Bubbles />
        <Link
          href="/"
          className="relative z-10 font-display text-3xl font-bold tracking-tight"
        >
          Fi<span className="text-fizz">zz</span>
          <span className="align-super text-xs text-bubble">●</span>
        </Link>

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            The Café Operating System
          </p>
          <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight">
            The counter&apos;s open. <span className="text-fizz">Pour</span>{" "}
            yourself in.
          </h2>
          <p className="mt-4 max-w-[48ch] text-steam">
            POS, inventory, and margins in one live loop. Sign in to run the
            floor.
          </p>
        </div>

        <p className="relative z-10 text-sm text-steam">
          Fast. Sharp. Effervescent. Honest.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-block font-display text-2xl font-bold tracking-tight lg:hidden"
          >
            Fi<span className="text-fizz">zz</span>
            <span className="align-super text-xs text-bubble">●</span>
          </Link>

          <h1 className="font-display text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-steam">Sign in to your café.</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-8 text-sm text-steam">
            No account yet? Your café admin pours the first cup.
          </p>
        </div>
      </section>
    </main>
  );
}
