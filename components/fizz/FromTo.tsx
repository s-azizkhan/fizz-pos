const ROWS = [
  {
    from: "Sales in one app, stock counted by hand, costs in a spreadsheet that's already wrong.",
    to: "One live system: every sale auto-depletes inventory in real time.",
  },
  {
    from: '"Did we run out of oat milk?" — found out at 8am rush.',
    to: "Low-stock alerts before you open. Reorder in two taps.",
  },
  {
    from: "Owner does the books at midnight, exhausted.",
    to: "Margins, waste, and best-sellers visible on the phone, anytime.",
  },
];

export default function FromTo() {
  return (
    <section id="problem" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          The problem
        </div>
        <h2 className="font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          We don&apos;t sell a register. We replace the chaos.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-steam">
          The competitor isn&apos;t Toast or Square. It&apos;s the notebook, the
          spreadsheet, the &ldquo;I&apos;ll remember it.&rdquo; Fizz attacks the
          status quo of running a café on guesswork.
        </p>

        <div className="mt-8 overflow-hidden rounded-fizz border border-ink-line">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="border-b border-ink-line px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-steam sm:border-r">
              From — the old way
            </div>
            <div className="border-b border-ink-line bg-fizz/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-fizz">
              To — Fizz
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
