// Honest, product-truth numbers — no fabricated adoption stats. Big display
// numerals (Space Grotesk), lime accent, hairline-separated.

const STATS = [
  { n: "0", label: "Midnight stock counts" },
  { n: "1", label: "Live loop — POS, inventory, margins" },
  { n: "2", label: "Taps to reorder when you're low" },
  { n: "100%", label: "Sales that auto-deduct stock" },
];

export default function Stats() {
  return (
    <section className="border-b border-ink-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden border-x border-ink-line bg-ink-line md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-ink px-6 py-12 text-center">
            <div className="font-display text-[clamp(40px,7vw,64px)] font-bold leading-none tracking-tight text-fizz">
              {s.n}
            </div>
            <div className="mx-auto mt-3 max-w-[18ch] text-sm text-steam">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
