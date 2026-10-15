// Fizz vs the usual suspects. Competitor cells stay general (pricing model,
// who it's built for, how you get set up) — defensible, not feature-sniping.
// Swap names in COLS; rows use the same index order.

const COLS = ["Fizz", "Petpooja", "RoyalPOS", "Excel + khata"];

const ROWS: { k: string; v: [string, string, string, string] }[] = [
  {
    k: "Built for",
    v: ["Any quick-service counter, 1–3 outlets", "Every restaurant type, chains", "Retail + restaurant, general", "Nobody — it just happened"],
  },
  {
    k: "Price",
    v: ["Free during early access, no card", "Annual licence per outlet + paid add-ons", "Annual licence per device + add-ons", "Free, costs you 3–8% in leaks"],
  },
  {
    k: "Features you don't need",
    v: ["Switch them off — they vanish", "Always there, always in the menu", "Always there, always in the menu", "—"],
  },
  {
    k: "Hardware",
    v: ["Any phone / tablet / laptop you own", "Usually bundled billing hardware", "Windows / Android device", "A notebook"],
  },
  {
    k: "Setup",
    v: ["One WhatsApp call, billing same day", "Onboarding team, training sessions", "Install + training", "Nothing — and nothing works"],
  },
  {
    k: "Recipe-level stock deduction",
    v: ["Built in, on every bill", "Inventory module", "Inventory module", "Manual, whenever you remember"],
  },
  {
    k: "Live margin per item",
    v: ["On every item, today's costs", "Reports", "Reports", "Guess"],
  },
  {
    k: "UPI QR + GST bill",
    v: ["Built in", "Built in", "Built in", "Phone QR + handwritten"],
  },
  {
    k: "Public menu on your own domain",
    v: ["Built in, free", "Separate online-ordering product", "Separate online-ordering product", "—"],
  },
  {
    k: "Who answers when it breaks",
    v: ["The founder, on WhatsApp", "Support desk / ticket", "Support desk / ticket", "You"],
  },
];

export default function Compare() {
  return (
    <section id="compare" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Compare
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Big POS is built for chains. Fizz is built for your counter.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-steam">
          Petpooja, RoyalPOS, eZee — good software for a 40-outlet chain with
          an IT guy. You have one counter, a tablet, and a rush at 9pm. You
          shouldn&apos;t pay for, or scroll past, 30 screens you&apos;ll never
          open.
        </p>

        <div className="mt-10 overflow-x-auto rounded-fizz border border-ink-line">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left text-xs font-semibold uppercase tracking-[0.14em]">
                <th className="px-5 py-4 text-steam"></th>
                {COLS.map((c, i) => (
                  <th
                    key={c}
                    className={`px-5 py-4 ${i === 0 ? "bg-fizz/[0.06] text-fizz" : "text-steam"}`}
                  >
                    {i === 0 ? (
                      <span className="font-wordmark text-base normal-case tracking-normal">
                        Fi<span className="text-fizz">zz</span>
                        <span className="align-super text-[0.6em] text-bubble">●</span>
                      </span>
                    ) : (
                      c
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {ROWS.map((r) => (
                <tr key={r.k}>
                  <th className="px-5 py-4 text-left font-display font-semibold text-cream">
                    {r.k}
                  </th>
                  {r.v.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-5 py-4 align-top ${
                        i === 0 ? "bg-fizz/[0.06] font-semibold text-cream" : "text-steam"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-steam">
          Competitor details from their public pages, Oct 2026. Plans change —
          confirm with the vendor. Petpooja, RoyalPOS and eZee are trademarks
          of their owners; no affiliation.
        </p>
      </div>
    </section>
  );
}
