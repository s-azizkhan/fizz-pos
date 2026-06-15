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
        Real margin, per item — not a guess.
      </div>
    </div>
  );
}

export default function WhyFizz() {
  return (
    <section id="why" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Why Fizz
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Effervescent on the surface. Ruthless underneath.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3 md:auto-rows-[minmax(0,1fr)]">
          {/* Hero cell */}
          <div className="flex flex-col rounded-fizz border border-ink-line bg-ink-soft p-7 md:col-span-2 md:row-span-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
              Fast at the counter
            </div>
            <h3 className="mt-3 max-w-[18ch] font-display text-2xl font-bold tracking-tight">
              Ring the rush without breaking a sweat.
            </h3>
            <p className="mt-2.5 max-w-[44ch] text-steam">
              Tap, total, settle. The line keeps moving while every sale quietly
              updates what you own in the back.
            </p>

            {/* Mini keypad / ticket */}
            <div className="mt-auto grid grid-cols-3 gap-2.5 pt-7">
              {["Latte", "Croissant", "Cold brew", "Mocha", "Bagel", "Settle"].map(
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
            <h3 className="font-display text-lg font-bold">Sharp in the back</h3>
            <p className="mt-2 text-sm text-steam">
              Every sale deducts ingredients automatically. Stock you can trust.
            </p>
            <MiniBars />
          </div>

          {/* Honest about money */}
          <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
            <h3 className="font-display text-lg font-bold">Honest about money</h3>
            <p className="mt-2 text-sm text-steam">
              Margins, waste, and your real best-sellers — plainly.
            </p>
            <MiniRing />
          </div>

          {/* Wide bottom cell */}
          <div className="flex flex-col justify-between gap-5 rounded-fizz border border-ink-line bg-ink-soft p-7 md:col-span-3 md:flex-row md:items-center">
            <div>
              <h3 className="font-display text-lg font-bold">
                Low-stock alerts before you open
              </h3>
              <p className="mt-2 max-w-[54ch] text-sm text-steam">
                Find out you&apos;re low on oat milk at 7am — not at the 8am
                rush. Reorder in two taps, from your phone.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {["Oat milk · low", "Espresso beans · 2 days", "Reorder ↻"].map(
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
