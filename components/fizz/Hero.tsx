import Bubbles from "./Bubbles";
import Link from "next/link";
import HeroChat from "./landing/HeroChat";
import { WA_HREF } from "./landing/contact";

// One question, one answer, one field. Everything else lives below the fold.
const TRUST = ["UPI + GST", "Any Android", "Hindi / English", "Free to start"];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden border-b border-ink-line"
    >
      <Bubbles />
      <div className="fizz-glow pointer-events-none absolute -right-40 -top-40 h-[680px] w-[680px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-16 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            The Counter Operating System
          </div>

          <h1 className="mt-6 max-w-[14ch] font-display text-[clamp(34px,5.6vw,64px)] font-bold leading-[0.98] tracking-tight">
            &ldquo;Aaj kitna bana?&rdquo;{" "}
            <span className="text-steam">Finally, a real answer.</span>
          </h1>

          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-steam">
            Fizz bills your counter in three taps, takes UPI on screen, and
            tells you every night what you{" "}
            <span className="text-cream">actually</span> made — sales, cost,
            profit. Pizza, chai, momos, ice cream. Any counter.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="rounded-fizz bg-fizz px-7 py-3.5 text-center font-semibold text-ink transition-transform hover:scale-105"
            >
              Start free →
            </Link>
            <a
              href={WA_HREF("Hi, I run a food counter and want to see Fizz.")}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line bg-ink-soft px-6 py-3.5 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
            >
              <span className="text-bubble">●</span> WhatsApp the founder
            </a>
          </div>
          <p className="mt-4 text-sm text-steam">
            No card. No hardware. Billing in ten minutes — setup help on WhatsApp, Hindi or English.
          </p>

          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium uppercase tracking-[0.14em] text-steam">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-bubble" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroChat />
        </div>
      </div>
    </section>
  );
}
