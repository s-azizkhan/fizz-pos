const ROWS = [
  {
    from: "Cheese, chicken and buns counted by eye. Excel updated “later”.",
    to: "Every order deducts its recipe — 160 g mozzarella, 1 bun, 2 leg pieces — the second it's billed.",
  },
  {
    from: "Buns finish at 9pm Friday. You find out from the counter.",
    to: "Low-stock warning Friday morning. Reorder before the rush, not during it.",
  },
  {
    from: "Register total ≠ cash + UPI. Nobody knows why.",
    to: "Each bill tagged cash / UPI / card. Day-end total matches, or shows exactly where it doesn't.",
  },
  {
    from: "Zinger price set last year. Margin today: a guess.",
    to: "Live margin per item from today's ingredient costs. Raise price or fix the recipe — you decide with numbers.",
  },
  {
    from: "Staff hand out “free” items. You find out at month-end, if ever.",
    to: "Every item rung in, every void logged with who and when. Honest counter, without policing.",
  },
  {
    from: "Two hours of tallying after close.",
    to: "Day-end report on your phone before you've locked the shutter.",
  },
];

export default function Remedy() {
  return (
    <section id="remedy" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          The fix
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Not another billing app. A counter that counts.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-steam">
          Most POS software prints a bill and stops. Fizz keeps going — into
          your fridge, your freezer, your margins. One system, one truth.
        </p>

        <div className="mt-8 overflow-hidden rounded-fizz border border-ink-line">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="border-b border-ink-line px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-steam sm:border-r">
              Today
            </div>
            <div className="border-b border-ink-line bg-fizz/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-fizz">
              With Fizz
            </div>
            {ROWS.map((r, i) => (
              <div key={i} className="contents">
                <div className="border-b border-ink-line px-6 py-5 text-steam sm:border-r">
                  {r.from}
                </div>
                <div className="border-b border-ink-line bg-fizz/[0.06] px-6 py-5">
                  {r.to}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
