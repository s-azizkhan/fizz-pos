import Link from "next/link";
import Bubbles from "@/components/fizz/Bubbles";
import WhatsAppButton from "./WhatsAppButton";
import { PHONE_DISPLAY, TEL_HREF } from "./contact";

export default function Cta() {
  return (
    <section id="start" className="relative overflow-hidden border-b border-ink-line">
      <Bubbles />
      <div className="fizz-glow pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28">
        <div className="rounded-fizz border border-ink-line bg-ink-soft/80 p-8 backdrop-blur sm:p-12">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Free to start · no card · no hardware
          </div>
          <h2 className="max-w-[18ch] font-display text-[clamp(28px,4.5vw,46px)] font-bold leading-[1.05] tracking-tight">
            Every day without counting is a day of leaking.{" "}
            <span className="text-fizz">Stop it tonight.</span>
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-steam">
            Create your counter, add your menu, bill your first order — ten
            minutes. Stuck anywhere? WhatsApp the founder, Hindi or English.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-fizz bg-fizz px-7 py-3.5 text-center font-semibold text-ink transition-transform hover:scale-105"
            >
              Open your counter →
            </Link>
            <WhatsAppButton />
          </div>
          <a
            href={TEL_HREF}
            className="mt-6 inline-block text-sm text-steam transition-colors hover:text-cream"
          >
            or call {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  );
}
