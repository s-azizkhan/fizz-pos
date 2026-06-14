const BEATS = [
  {
    k: "Observation",
    v: "Independent cafés finally went cashless and cloud — but their back office is still pen, paper, and panic.",
  },
  {
    k: "The gap",
    v: "Selling fast means nothing if you can't see what it costs you. POS and inventory living apart is why thin-margin cafés quietly bleed out.",
  },
  {
    k: "Ramification",
    v: "Run on disconnected tools and you over-order, run out, mis-price, and never know which drink actually makes money.",
  },
  {
    k: "The vision",
    v: "The counter and the storeroom should be one nervous system — every tap of 'sell' updating what you own.",
  },
  {
    k: "The solution",
    v: "Fizz — the Café Operating System. POS, inventory, and margins in one effervescent live loop.",
  },
];

export default function POV() {
  return (
    <section id="how" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          How it works
        </div>
        <h2 className="font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          One nervous system for the whole café
        </h2>

        <div className="mt-8 divide-y divide-ink-line">
          {BEATS.map((b) => (
            <div
              key={b.k}
              className="grid grid-cols-1 gap-2 py-5 md:grid-cols-[180px_1fr] md:gap-6"
            >
              <div className="font-display text-sm font-semibold uppercase tracking-wide text-fizz">
                {b.k}
              </div>
              <div className="text-lg">{b.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
