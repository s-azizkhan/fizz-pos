// The signature visual: Fizz's "one live loop" as an orbiting diagram.
// Sell → Deduct → See, forever. Pure CSS orbit (deterministic, SSR-safe).

const NODES = [
  { icon: "☕", k: "Sell", v: "Ring an order in seconds.", pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { icon: "📦", k: "Deduct", v: "Stock updates itself.", pos: "bottom-0 left-0 -translate-x-1/4 translate-y-1/4" },
  { icon: "📈", k: "See", v: "Margins, plainly.", pos: "bottom-0 right-0 translate-x-1/4 translate-y-1/4" },
];

export default function Loop() {
  return (
    <section className="border-b border-ink-line">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Copy */}
        <div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            One live loop
          </div>
          <h2 className="max-w-[16ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
            The counter and the storeroom, finally on the same wire.
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-steam">
            Every tap of <span className="text-cream">sell</span> ripples through
            the whole café — stock drops, costs settle, margins surface. No
            export, no reconciliation, no midnight count.
          </p>
        </div>

        {/* Diagram */}
        <div className="flex justify-center">
          <div className="relative aspect-square w-full max-w-[380px]">
            {/* Orbit ring */}
            <div className="absolute inset-8 rounded-full border border-dashed border-ink-line" />

            {/* Orbiting dot */}
            <div
              className="fizz-orbit absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fizz shadow-[0_0_18px_4px_rgba(198,244,50,0.5)]"
              style={{ ["--orbit-r" as string]: "150px" }}
            />

            {/* Center hub */}
            <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-ink-line bg-ink-soft text-center">
              <span className="font-display text-lg font-bold tracking-tight">
                Fi<span className="text-fizz">zz</span>
                <span className="align-super text-[0.6em] text-bubble">●</span>
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-steam">
                live loop
              </span>
            </div>

            {/* Nodes */}
            {NODES.map((n) => (
              <div
                key={n.k}
                className={`absolute ${n.pos} w-40 rounded-fizz border border-ink-line bg-ink-soft p-3 text-center shadow-[0_12px_40px_-16px_rgba(0,0,0,0.8)]`}
              >
                <div className="text-xl">{n.icon}</div>
                <div className="mt-1 font-display text-sm font-bold text-fizz">
                  {n.k}
                </div>
                <div className="text-xs text-steam">{n.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
