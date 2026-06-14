import Bubbles from "./Bubbles";
import WaitlistForm from "./WaitlistForm";

const PILLS = [
  "POS + inventory, one live loop",
  "Built for independent cafés",
  "Goodbye, spreadsheet",
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[88vh] flex-col justify-center overflow-hidden border-b border-ink-line"
    >
      <Bubbles />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24">
        <div className="mb-7 font-display text-[clamp(56px,11vw,120px)] font-bold leading-none tracking-[-0.04em]">
          Fi<span className="text-fizz">zz</span>
          <span className="align-super text-[0.4em] text-bubble">●</span>
        </div>

        <h1 className="max-w-[18ch] font-display text-[clamp(28px,5vw,56px)] font-semibold leading-tight tracking-tight">
          The café runs on <span className="text-fizz">Fizz</span>. The spreadsheet
          is dead.
        </h1>

        <p className="mt-5 max-w-[60ch] text-lg text-steam">
          A point-of-sale and inventory system built for independent cafés and
          restaurants — fast at the counter, sharp in the back office,
          effervescent everywhere.
        </p>

        <div className="mt-9 max-w-2xl" id="waitlist">
          <WaitlistForm />
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {PILLS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-ink-line bg-ink-soft px-4 py-2 text-sm"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
