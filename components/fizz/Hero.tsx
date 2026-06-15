import Bubbles from "./Bubbles";
import WaitlistForm from "./WaitlistForm";
import ProductMock from "./landing/ProductMock";

const PILLS = [
  "POS + inventory, one live loop",
  "Built for independent cafés",
  "Goodbye, spreadsheet",
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden border-b border-ink-line"
    >
      <Bubbles />
      {/* Effervescent lime glow, top-right */}
      <div className="fizz-glow pointer-events-none absolute -right-40 -top-40 h-[680px] w-[680px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: message */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-line bg-ink-soft/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-steam backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-bubble" />
            The Café Operating System
          </span>

          <div className="mt-6 font-display text-[clamp(52px,10vw,104px)] font-bold leading-none tracking-[-0.04em]">
            Fi<span className="text-fizz">zz</span>
            <span className="align-super text-[0.4em] text-bubble">●</span>
          </div>

          <h1 className="mt-5 max-w-[16ch] font-display text-[clamp(28px,5vw,52px)] font-semibold leading-[1.05] tracking-tight">
            The café runs on <span className="text-fizz">Fizz</span>. The
            spreadsheet is dead.
          </h1>

          <p className="mt-5 max-w-[52ch] text-lg text-steam">
            Point-of-sale and inventory in one live loop — fast at the counter,
            sharp in the back office, effervescent everywhere.
          </p>

          <div className="mt-9 max-w-2xl" id="waitlist">
            <WaitlistForm />
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

        {/* Right: live product mock */}
        <div className="flex justify-center lg:justify-end">
          <ProductMock />
        </div>
      </div>

      {/* Scroll cue */}
      <div className="relative z-10 mx-auto hidden w-full max-w-6xl px-6 pb-8 lg:block">
        <span className="text-xs uppercase tracking-[0.24em] text-steam">
          Scroll — see the loop ↓
        </span>
      </div>
    </section>
  );
}
