// Qualify the reader. Saying who it's NOT for makes the "for" column land.

const YES = [
  "Pizza, burger, fried chicken or wings outlet in India",
  "1–3 outlets, owner-run or a manager you trust",
  "Billing on a phone/tablet is fine — no hardware fetish",
  "Tired of Excel, khata, and “I'll remember it”",
  "Want to know today's real profit, today",
];

const NO = [
  "Fine dining with table service and a 200-item menu",
  "A 50-outlet chain that needs an ERP",
  "You never want to set up recipes (that's where the magic is)",
  "You're happy with the Friday 9pm stock-out",
];

export default function Fit() {
  return (
    <section id="fit" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Is Fizz for you?
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Built for small QSR cafés. Honestly, not for everyone.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-fizz border border-fizz/40 bg-fizz/[0.05] p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Fizz fits if
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {YES.map((t) => (
                <li key={t} className="flex gap-3 text-cream">
                  <span className="text-fizz">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
              Skip it if
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {NO.map((t) => (
                <li key={t} className="flex gap-3 text-steam">
                  <span>✕</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
