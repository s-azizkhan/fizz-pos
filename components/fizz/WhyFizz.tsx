// Feature bento — asymmetric grid, one hero cell with a live mini-visual,
// supporting cells around it. Hairline borders, lime as accent only.

function MiniBars() {
  const bars = [
    { w: "82%", lime: false },
    { w: "54%", lime: true },
    { w: "38%", lime: false },
    { w: "66%", lime: false },
  ];
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {bars.map((b, i) => (
        <div key={i} className="h-2 overflow-hidden rounded-full bg-ink-line">
          <div
            className={`h-full rounded-full ${b.lime ? "bg-fizz" : "bg-steam/50"}`}
            style={{ width: b.w }}
          />
        </div>
      ))}
    </div>
  );
}

function MiniRing() {
  return (
    <div className="mt-5 flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        <div
          className="h-16 w-16 rounded-full"
          style={{
            background:
              "conic-gradient(var(--color-fizz) 0% 72%, var(--color-ink-line) 72% 100%)",
          }}
        />
        <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-ink-soft">
          <span className="font-display text-sm font-bold">72%</span>
        </div>
      </div>
      <div className="text-sm text-steam">
        Your real margin on the Zinger — not a guess.
      </div>
    </div>
  );
}

export default function WhyFizz() {
  return (
    <section id="why" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          What you get
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Everything a QSR counter needs. Nothing it doesn&apos;t.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3 md:auto-rows-[minmax(0,1fr)]">
          {/* Hero cell */}
          <div className="flex flex-col rounded-fizz border border-ink-line bg-ink-soft p-7 md:col-span-2 md:row-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Fast at the counter
            </div>
            <h3 className="mt-3 max-w-[18ch] font-display text-2xl font-bold tracking-tight">
              Bill the Friday rush in 3 taps.
            </h3>
            <p className="mt-2.5 max-w-[44ch] text-steam">
              Tap item, tap UPI, show QR. GST on the bill automatically. Any
              staff learns it in ten minutes — on the tablet you already have.
            </p>

            {/* Mini keypad / ticket */}
            <div className="mt-auto grid grid-cols-3 gap-2.5 pt-7">
              {["Margherita", "Zinger", "Wings 6pc", "Fries", "Coke", "UPI ₹"].map(
                (k, i) => (
                  <div
                    key={k}
                    className={`rounded-fizz border px-3 py-3 text-center text-sm font-semibold ${
                      i === 5
                        ? "border-fizz bg-fizz/10 text-fizz"
                        : "border-ink-line bg-ink text-cream"
                    }`}
                  >
                    {k}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Sharp in the back */}
          <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
            <h3 className="font-display text-lg font-bold">Recipe-level stock</h3>
            <p className="mt-2 text-sm text-steam">
              Cheese in grams, chicken in pieces, buns in units. Every bill
              deducts automatically.
            </p>
            <MiniBars />
          </div>

          {/* Honest about money */}
          <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
            <h3 className="font-display text-lg font-bold">Margin per item</h3>
            <p className="mt-2 text-sm text-steam">
              Which item makes money, which one just makes noise. Plain numbers.
            </p>
            <MiniRing />
          </div>

          {/* Wide bottom cell */}
          <div className="flex flex-col justify-between gap-5 rounded-fizz border border-ink-line bg-ink-soft p-7 md:col-span-3 md:flex-row md:items-center">
            <div>
              <h3 className="font-display text-lg font-bold">
                Low-stock alerts before the rush
              </h3>
              <p className="mt-2 max-w-[54ch] text-sm text-steam">
                Know you&apos;re short on buns Friday morning — not Friday 9pm.
                Plus: expenses, daily cash-up, QR menu, WhatsApp orders, staff
                roles. All in.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {["Burger buns · low", "Chicken · 1 day", "Reorder ↻"].map(
                (a, i) => (
                  <span
                    key={a}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                      i === 0
                        ? "border-[#E2655A]/50 text-[#E2655A]"
                        : i === 2
                          ? "border-fizz bg-fizz/10 text-fizz"
                          : "border-ink-line text-steam"
                    }`}
                  >
                    {a}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
