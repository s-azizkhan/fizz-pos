// A self-animating mock of the Fizz counter — the hero centerpiece. Pure markup
// + CSS keyframes (deterministic, no JS, SSR-safe). Shows the "live loop": ring
// an item, watch stock drain, see the margin. Decorative only (aria-hidden).

const LINES = [
  { name: "Flat white", qty: "×2", price: "9.00" },
  { name: "Almond croissant", qty: "×1", price: "4.50" },
  { name: "Cold brew", qty: "×1", price: "5.00" },
];

export default function ProductMock() {
  return (
    <div aria-hidden className="fizz-float w-full max-w-[420px]">
      <div className="rounded-fizz border border-ink-line bg-ink-soft/90 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fizz/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fizz" />
            </span>
            <span className="font-display text-sm font-semibold tracking-tight text-cream">
              Counter · live
            </span>
          </div>
          <span className="rounded-full border border-ink-line px-2.5 py-0.5 text-xs text-steam">
            Table 4
          </span>
        </div>

        {/* Ticket */}
        <div className="mt-5 flex flex-col gap-3">
          {LINES.map((l) => (
            <div key={l.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-cream">
                <span className="text-steam">{l.qty}</span>
                {l.name}
              </span>
              <span className="font-display font-semibold text-cream">${l.price}</span>
            </div>
          ))}
          {/* The freshly-rung line pops in on a loop */}
          <div
            className="flex items-center justify-between text-sm"
            style={{ animation: "pop-in 5s ease-in-out infinite" }}
          >
            <span className="flex items-center gap-2 text-fizz">
              <span className="text-fizz/70">×1</span>
              Matcha latte
            </span>
            <span className="font-display font-semibold text-fizz">$5.50</span>
          </div>
        </div>

        {/* Total */}
        <div className="mt-5 flex items-center justify-between border-t border-ink-line pt-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
            Total
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-cream">
            $24.00
          </span>
        </div>

        {/* Live widgets: stock drain + margin ring */}
        <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4 rounded-fizz border border-ink-line bg-ink/60 p-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-steam">Oat milk</span>
              <span className="text-fizz">auto-deducting</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-line">
              <div className="fizz-drain h-full rounded-full bg-fizz" />
            </div>
            <p className="mt-2 text-[11px] text-steam">
              Every sale depletes stock in real time.
            </p>
          </div>

          {/* Margin ring (conic) */}
          <div className="relative h-16 w-16">
            <div
              className="h-16 w-16 rounded-full"
              style={{
                background:
                  "conic-gradient(var(--color-fizz) 0% 68%, var(--color-ink-line) 68% 100%)",
              }}
            />
            <div className="absolute inset-[6px] flex flex-col items-center justify-center rounded-full bg-ink-soft">
              <span className="font-display text-sm font-bold text-cream">68%</span>
              <span className="text-[9px] uppercase tracking-wide text-steam">
                margin
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
