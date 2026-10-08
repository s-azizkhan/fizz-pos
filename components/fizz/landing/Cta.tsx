import Bubbles from "@/components/fizz/Bubbles";
import WaitlistForm from "@/components/fizz/WaitlistForm";
import WhatsAppButton from "./WhatsAppButton";
import { PHONE_DISPLAY, TEL_HREF } from "./contact";

export default function Cta() {
  return (
    <section id="waitlist-cta" className="relative overflow-hidden border-b border-ink-line">
      <Bubbles />
      <div className="fizz-glow pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28">
        <div className="rounded-fizz border border-ink-line bg-ink-soft/80 p-8 backdrop-blur sm:p-12">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Early access · limited onboarding slots this month
          </div>
          <h2 className="max-w-[18ch] font-display text-[clamp(28px,4.5vw,46px)] font-bold leading-[1.05] tracking-tight">
            Every day without counting is a day of leaking.{" "}
            <span className="text-fizz">Stop it this week.</span>
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-steam">
            Leave your details. We set up your menu and recipes with you on a
            WhatsApp call. You bill on Fizz the same day.
          </p>
          <div className="mt-8">
            <WaitlistForm cta="Get early access →" />
          </div>
          <div className="mt-6 flex flex-col items-start gap-3 border-t border-ink-line pt-6 sm:flex-row sm:items-center">
            <WhatsAppButton />
            <a href={TEL_HREF} className="text-sm text-steam transition-colors hover:text-cream">
              or call {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
