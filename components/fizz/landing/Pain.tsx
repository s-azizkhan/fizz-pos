// The leak — name the exact ways a QSR café bleeds money. Numbers are worked
// examples with the arithmetic shown, not adoption claims.

const LEAKS = [
  {
    k: "Over-portioning",
    v: "20 g extra mozzarella on every pizza. Nobody notices. At 60 pizzas a day that's 1.2 kg — about ₹500 — gone daily.",
    n: "≈ ₹15,000 / month",
  },
  {
    k: "“Free” items",
    v: "Fries for a friend. Coke for the delivery boy. A burger not rung in. No one is stealing — but nothing is counted either.",
    n: "3–5% of sales",
  },
  {
    k: "Friday 9pm stock-out",
    v: "Buns finish. Chicken finishes. The rush is still at the counter. Every “sorry, out of stock” is a customer who tries the place next door.",
    n: "Your best hour, lost",
  },
  {
    k: "Khata vs. cash",
    v: "Register says ₹42,000. Cash + UPI says ₹39,600. Who do you ask? You don't — you just absorb it.",
    n: "Unexplained gap, every week",
  },
  {
    k: "Blind pricing",
    v: "You priced the Zinger at ₹169 last year. Chicken went up 18% since. Your margin on your best-seller is now a guess.",
    n: "Unknown margin",
  },
  {
    k: "Midnight bookkeeping",
    v: "Close at 11. Tally bills, count stock, update Excel. Sleep at 1. Do it again tomorrow — or skip it and fly blind.",
    n: "2 hrs / night",
  },
];

export default function Pain() {
  return (
    <section id="problem" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Where the money goes
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Sales are up. Bank balance isn&apos;t. Here&apos;s why.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-steam">
          A QSR café doesn&apos;t lose money in one big hit. It leaks in six
          small places, every single day. You feel it at month-end. You
          can&apos;t point to it.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LEAKS.map((l) => (
            <div
              key={l.k}
              className="flex flex-col rounded-fizz border border-ink-line bg-ink-soft p-7"
            >
              <h3 className="font-display text-lg font-bold">{l.k}</h3>
              <p className="mt-2 flex-1 text-sm text-steam">{l.v}</p>
              <div className="mt-5 font-display text-xl font-bold tracking-tight text-[#E2655A]">
                {l.n}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-steam">
          Worked examples — your numbers will differ. Try yours below.
        </p>
      </div>
    </section>
  );
}
