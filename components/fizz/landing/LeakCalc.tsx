"use client";

import { useState } from "react";
import WhatsAppButton from "./WhatsAppButton";

// ponytail: fixed 3%–8% leak band as the stated assumption; no per-category model.
const LOW = 0.03;
const HIGH = 0.08;

const fmt = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export default function LeakCalc() {
  const [daily, setDaily] = useState(25000);
  const monthly = daily * 30;
  const lo = monthly * LOW;
  const hi = monthly * HIGH;

  return (
    <section id="calc" className="border-b border-ink-line bg-ink-soft/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
        <div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Your leak, in rupees
          </div>
          <h2 className="max-w-[18ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
            How much is guesswork costing your café?
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-steam">
            Drag to your average daily sales. Uncounted stock, unrung items and
            portion drift typically eat 3–8% of a QSR&apos;s revenue. See what
            that is for you.
          </p>

          <label className="mt-8 block">
            <span className="flex items-center justify-between text-sm text-steam">
              <span>Daily sales</span>
              <span className="font-display text-lg font-bold text-cream">
                {fmt(daily)} / day
              </span>
            </span>
            <input
              type="range"
              min={5000}
              max={150000}
              step={1000}
              value={daily}
              onChange={(e) => setDaily(Number(e.target.value))}
              className="mt-3 w-full accent-fizz"
            />
            <span className="mt-1 flex justify-between text-xs text-steam">
              <span>₹5k</span>
              <span>₹1.5L</span>
            </span>
          </label>
        </div>

        <div className="rounded-fizz border border-ink-line bg-ink p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
            Estimated monthly leak
          </div>
          <div className="mt-3 font-display text-[clamp(34px,5vw,56px)] font-bold leading-none tracking-tight text-[#E2655A]">
            {fmt(lo)} – {fmt(hi)}
          </div>
          <div className="mt-2 text-sm text-steam">
            on {fmt(monthly)} monthly sales
          </div>

          <div className="mt-6 border-t border-ink-line pt-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
              Per year
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-tight text-cream">
              {fmt(lo * 12)} – {fmt(hi * 12)}
            </div>
            <p className="mt-2 max-w-[40ch] text-sm text-steam">
              That&apos;s a second outlet&apos;s deposit. Or a year of your
              own salary. Leaking quietly.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="#waitlist"
              className="rounded-fizz bg-fizz px-6 py-3 text-center font-semibold text-ink transition-transform hover:scale-105"
            >
              Plug the leak →
            </a>
            <WhatsAppButton
              text={`Hi, my café does about ${fmt(daily)}/day. Want to see how Fizz would help.`}
              label="Ask on WhatsApp"
            />
          </div>
          <p className="mt-4 text-xs text-steam">
            Estimate only. Band from typical QSR shrinkage and portion variance;
            your real number comes from your own stock count.
          </p>
        </div>
      </div>
    </section>
  );
}
