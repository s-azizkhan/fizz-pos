// The hero visual: Fizz's Daily report and Margins screens, shown as the
// close-of-day messages they amount to. No owner bubbles, no typing dots —
// Fizz has no chat; it has the numbers ready when the shutter comes down.
// Pure markup + CSS delays (deterministic, SSR-safe). Decorative.

type Card = { title: string; rows: [string, string][]; note?: string; t: string };

const CARDS: Card[] = [
  {
    title: "Daily report · Tue 14 Oct",
    rows: [
      ["Sales", "₹18,420"],
      ["Orders", "142"],
      ["Cost", "₹7,180"],
      ["Profit", "₹11,240 · 61%"],
    ],
    note: "Busiest 8–9 pm. UPI 71%. 2 voids, both by Raju.",
    t: "11:02 pm",
  },
  {
    title: "Margins · top item",
    rows: [
      ["Veg momos", "86 plates"],
      ["Margin", "58%"],
      ["Momo sheets", "2 days left"],
    ],
    note: "Reorder by Thursday — weekend rush.",
    t: "11:02 pm",
  },
];

// Seconds between cards.
const STEP = 1.1;

export default function HeroChat() {
  return (
    <div aria-hidden className="w-full max-w-[400px]">
      <div className="rounded-fizz border border-ink-line bg-ink-soft/80 backdrop-blur">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-ink-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fizz font-wordmark text-lg font-bold text-ink">
            F
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-cream">
              Fi<span className="text-fizz">zz</span> · Daily report
            </div>
            <div className="flex items-center gap-1.5 text-xs text-steam">
              <span className="h-1.5 w-1.5 rounded-full bg-fizz" /> ready at close, every night
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3 px-5 py-5">
          {CARDS.map((c, i) => (
            <div
              key={c.title}
              className="fizz-chat-in flex flex-col items-start"
              style={{ animationDelay: `${0.4 + i * STEP}s` }}
            >
              <div className="w-[88%] rounded-fizz rounded-bl-md border border-ink-line bg-ink px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fizz">
                  {c.title}
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {c.rows.map(([k, v], j) => (
                    <div key={k} className="contents">
                      <dt className="text-steam">{k}</dt>
                      <dd
                        className={`text-right font-display font-semibold ${
                          j === c.rows.length - 1 ? "text-fizz" : "text-cream"
                        }`}
                      >
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                {c.note && (
                  <p className="mt-2.5 border-t border-ink-line pt-2 text-xs text-steam">
                    {c.note}
                  </p>
                )}
              </div>
              <span className="mt-1 text-[10px] text-steam">{c.t}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-steam">
        Your Daily report and Margins screens, as they read at close.
      </p>
    </div>
  );
}
