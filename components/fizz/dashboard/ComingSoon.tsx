export default function ComingSoon({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">{blurb}</p>

      <div className="mt-10 flex min-h-[40vh] items-center justify-center rounded-fizz border border-dashed border-ink-line bg-ink-soft/40">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-fizz">Brewing ●</p>
          <p className="mt-2 text-sm text-steam">
            This corner of the café is still warming up.
          </p>
        </div>
      </div>
    </div>
  );
}
