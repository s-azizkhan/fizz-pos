const COLS = [
  {
    title: "Product",
    links: [
      { label: "The problem", href: "#problem" },
      { label: "One live loop", href: "#how" },
      { label: "Why Fizz", href: "#why" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Early access", href: "#waitlist-cta" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">
              Fi<span className="text-fizz">zz</span>
              <span className="align-super text-xs text-bubble">●</span>
            </div>
            <p className="mt-3 max-w-[34ch] text-sm text-steam">
              The Café Operating System. POS, inventory, and margins in one
              effervescent live loop.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                {c.title}
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-steam transition-colors hover:text-cream"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ink-line pt-6 text-sm text-steam sm:flex-row">
          <span>
            © {2026} <span className="text-cream">Fizz</span> — pour fast, count
            never.
          </span>
          <span>POS · Inventory · Margins</span>
        </div>
      </div>
    </footer>
  );
}
