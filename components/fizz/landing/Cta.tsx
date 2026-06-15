import Bubbles from "@/components/fizz/Bubbles";
import WaitlistForm from "@/components/fizz/WaitlistForm";

export default function Cta() {
  return (
    <section id="waitlist-cta" className="relative overflow-hidden border-b border-ink-line">
      <Bubbles />
      <div className="fizz-glow pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28">
        <div className="rounded-fizz border border-ink-line bg-ink-soft/80 p-8 backdrop-blur sm:p-12">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Get early access
          </div>
          <h2 className="max-w-[18ch] font-display text-[clamp(28px,4.5vw,46px)] font-bold leading-[1.05] tracking-tight">
            Stop guessing. Pour your café onto{" "}
            <span className="text-fizz">Fizz</span>.
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-steam">
            We&apos;re onboarding independent cafés now. Drop your email and
            we&apos;ll pour you a spot.
          </p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-sm text-steam">
            No credit card. No spreadsheet. Just the counter, finally talking to
            the storeroom.
          </p>
        </div>
      </div>
    </section>
  );
}
