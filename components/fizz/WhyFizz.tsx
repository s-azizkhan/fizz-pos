const CARDS = [
  {
    h: "Fast at the counter",
    p: "Ring an order in seconds. The line keeps moving, the rush stays calm.",
  },
  {
    h: "Sharp in the back",
    p: "Every sale deducts ingredients automatically. Stock you can trust, no midnight counts.",
  },
  {
    h: "Honest about money",
    p: "See margins, waste, and your real best-sellers — the numbers, plainly, anytime.",
  },
];

export default function WhyFizz() {
  return (
    <section id="why" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Why Fizz
        </div>
        <h2 className="font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Effervescent on the surface. Ruthless underneath.
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <div
              key={c.h}
              className="rounded-fizz border border-ink-line bg-ink-soft p-7"
            >
              <h3 className="font-display text-xl font-semibold">{c.h}</h3>
              <p className="mt-2.5 text-steam">{c.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
