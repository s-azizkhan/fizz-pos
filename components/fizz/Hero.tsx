import Bubbles from "./Bubbles";
import WaitlistForm from "./WaitlistForm";
import ProductMock from "./landing/ProductMock";
import WhatsAppButton from "./landing/WhatsAppButton";

const PILLS = [
  "GPay · PhonePe · Paytm — any UPI QR",
  "GST on every bill",
  "Switch features on or off",
  "Runs on a ₹8,000 Android",
  "Hindi / English support on WhatsApp",
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
            The Counter Operating System · India
          </span>

          <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(30px,5.2vw,58px)] font-bold leading-[1.02] tracking-tight">
            Any counter. One POS.{" "}
            <span className="text-fizz">Zero leaks.</span>
          </h1>

          <p className="mt-5 max-w-[54ch] text-lg text-steam">
            Pizza, burgers, chai, momos, ice cream, rolls — if you sell over a
            counter, Fizz bills it in 3 taps, takes UPI on screen, counts every
            gram and every rupee, and shows what you{" "}
            <span className="text-cream">actually</span> made today. Your menu
            goes online with a QR and WhatsApp orders. Switch on only the parts
            you need.
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
