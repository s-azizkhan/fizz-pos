import type { Metadata } from "next";
import Link from "next/link";
import Bubbles from "@/components/fizz/Bubbles";
import JoinForm from "@/components/fizz/team/JoinForm";
import { trpc } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Join your café — Fizz",
  robots: { index: false, follow: false },
};

const ROLE_BLURB: Record<string, string> = {
  admin: "Everything — team, store settings, the books.",
  manager: "Runs the shift: till, menu, inventory, expenses.",
  staff: "Rings orders at the till.",
};

const Wordmark = ({ className }: { className?: string }) => (
  <Link href="/" className={`font-wordmark font-bold ${className ?? ""}`}>
    Fi<span className="text-fizz">zz</span>
    <span className="align-super text-xs text-bubble">●</span>
  </Link>
);

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const api = await trpc();

  // A bad or spent token is the normal case for a link that sat in a chat too
  // long — render it as a dead end, not a crash.
  const invite = await api.team.peek({ token }).catch(() => null);

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-ink-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Bubbles />
        <Wordmark className="relative z-10 text-3xl" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            The Café Operating System
          </p>
          <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight">
            You&apos;ve been handed <span className="text-fizz">the keys</span>.
          </h2>
          <p className="mt-4 max-w-[48ch] text-steam">
            Set your name and a password. That&apos;s the whole onboarding.
          </p>
        </div>
        <p className="relative z-10 text-sm text-steam">
          Fast. Sharp. Effervescent. Honest.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Wordmark className="mb-10 inline-block text-2xl lg:hidden" />

          {invite ? (
            <>
              <h1 className="font-display text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
                Join the floor
              </h1>
              <p className="mt-2 text-steam">
                Invited as{" "}
                <span className="font-semibold text-cream">{invite.email}</span>.
              </p>

              <div className="mt-5 rounded-fizz border border-ink-line bg-ink-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                  Your access
                </p>
                <p className="mt-2 font-display font-bold capitalize text-cream">
                  {invite.role}
                </p>
                <p className="mt-1 text-sm text-steam">{ROLE_BLURB[invite.role]}</p>
              </div>

              <div className="mt-8">
                <JoinForm token={token} />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-[clamp(26px,4vw,36px)] font-bold tracking-tight">
                This link fizzled
              </h1>
              <p className="mt-3 max-w-[40ch] text-steam">
                It&apos;s expired, already used, or was revoked. Ask your café admin
                for a fresh one.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-block rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
              >
                Go to sign in
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
