import Bubbles from "./Bubbles";
import WaitlistForm from "./WaitlistForm";
import ProductMock from "./landing/ProductMock";
import WhatsAppButton from "./landing/WhatsAppButton";

const PILLS = [
  "UPI QR at the till",
  "GST on every bill",
  "Recipe-level stock",
  "Runs on any phone or tablet",
  "Made in India",
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden border-b border-ink-line"
    >
      <Bubbles />
      <div className="fizz-glow pointer-events-none absolute -right-40 -top-40 h-[680px] w-[680px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-soft/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-steam backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-bubble" />
            For pizza, burger &amp; fried chicken cafés in India
          </span>

          <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(30px,5.2vw,58px)] font-bold leading-[1.02] tracking-tight">
            Your pizza sells.{" "}
            <span className="text-fizz">Your profit leaks.</span>
          </h1>

          <p className="mt-5 max-w-[54ch] text-lg text-steam">
            Extra cheese. &ldquo;Free&rdquo; fries for friends. Buns finished at
            9pm on Friday. Khata that never matches cash. Fizz is the POS that
            counts every gram and every rupee — so you know what you{" "}
            <span className="text-cream">actually</span> made today.
          </p>

          <div className="mt-8 max-w-2xl" id="waitlist">
            <WaitlistForm />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-steam">
            <span>Prefer to talk?</span>
            <WhatsAppButton className="px-4 py-2 text-sm" />
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {PILLS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-ink-line bg-ink-soft px-4 py-2 text-sm text-steam"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ProductMock />
        </div>
      </div>
    </section>
  );
}
