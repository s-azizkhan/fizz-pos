// Infinite marquee ribbon — the kind of place Fizz is built for. Track is
// duplicated and shifted -50% so the loop is seamless. Edges faded via mask.

const ITEMS = [
  "Independent roasters",
  "Neighbourhood cafés",
  "Brunch spots",
  "Artisan bakeries",
  "Espresso bars",
  "Specialty tea houses",
  "Corner coffee shops",
];

function Track() {
  return (
    <div className="fizz-marquee flex shrink-0 items-center gap-10 pr-10">
      {ITEMS.map((t) => (
        <span key={t} className="flex items-center gap-10 whitespace-nowrap">
          <span className="font-display text-lg font-semibold text-steam">{t}</span>
          <span className="text-bubble">●</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <section className="border-b border-ink-line py-7">
      <div className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-steam">
        Poured for
      </div>
      <div
        className="flex overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        <Track />
        <Track />
      </div>
    </section>
  );
}
