// The public menu — three phone-frame previews built from pure markup so
// they never go stale against a screenshot. Welcome screen → menu with
// WhatsApp cart → QR / own-domain card. Decorative (aria-hidden).

const FEATURES = [
  { k: "QR on the counter", v: "Print it, stick it. Guests scan, see today's menu, order from their seat." },
  { k: "WhatsApp orders", v: "Dine-in, takeaway or delivery — the order lands on your WhatsApp and in the POS." },
  { k: "Your own domain", v: "yourshop.in opens your menu. No app to install, no aggregator cut." },
  { k: "10 themes, your logo", v: "Midnight, Parchment, Neon, Terracotta… pick one, set your accent, done." },
  { k: "Printable PDF menu", v: "Same menu, export to a clean printable for the wall or the table." },
  { k: "Games while they wait", v: "Snake, 2048, Flappy — on your menu page. Kids stop asking “kitna time?”" },
];

function Phone({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <div className="mx-auto w-full max-w-[230px]">
      <div className={`rounded-[28px] border border-ink-line p-2 ${tone}`}>
        <div className="overflow-hidden rounded-[22px] bg-ink">
          <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-ink-line" />
          <div className="px-4 pb-5 pt-4 text-[11px] leading-snug">{children}</div>
        </div>
      </div>
    </div>
  );
}

function WelcomeMock() {
  return (
    <Phone tone="bg-ink-soft">
      <div className="flex h-[300px] flex-col justify-end rounded-2xl border border-ink-line bg-[linear-gradient(160deg,#1A1F28,#0E1116)] p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fizz font-display text-sm font-bold text-ink">
          S
        </div>
        <div className="mt-3 font-display text-base font-bold text-cream">Sharma Chai &amp; Snacks</div>
        <div className="text-steam">Sector 18 · Open till 11pm</div>
        <div className="mt-3 rounded-full bg-fizz py-2 text-center font-semibold text-ink">
          See menu →
        </div>
        <div className="mt-2 rounded-full border border-ink-line py-2 text-center text-cream">
          Order on WhatsApp
        </div>
      </div>
    </Phone>
  );
}

function MenuMock() {
  const items = [
    ["Cutting chai", "₹15"],
    ["Bun maska", "₹30"],
    ["Veg momos 8pc", "₹80"],
    ["Cold coffee", "₹90"],
  ];
  return (
    <Phone tone="bg-ink-soft">
      <div className="flex h-[300px] flex-col">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-cream">Menu</span>
          <span className="rounded-full border border-ink-line px-2 py-0.5 text-steam">Table 4</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {["Chai", "Snacks", "Momos", "Cold"].map((c, i) => (
            <span
              key={c}
              className={`rounded-full px-2 py-0.5 ${i === 0 ? "bg-fizz text-ink" : "border border-ink-line text-steam"}`}
            >
              {c}
            </span>
          ))}
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {items.map(([n, p]) => (
            <li key={n} className="flex items-center justify-between rounded-xl border border-ink-line px-2.5 py-2">
              <span className="text-cream">{n}</span>
              <span className="flex items-center gap-2">
                <span className="font-display font-semibold text-cream">{p}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fizz font-bold text-ink">+</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center justify-between rounded-full bg-fizz px-3 py-2 font-semibold text-ink">
          <span>3 items · ₹125</span>
          <span>Order on WhatsApp →</span>
        </div>
      </div>
    </Phone>
  );
}

function QrMock() {
  // 9×9 deterministic pseudo-QR: finder squares + a fixed bit pattern.
  const bits =
    "111111101" + "100000101" + "101110100" + "101110111" + "101110100" +
    "100000110" + "111111101" + "000000010" + "110101111";
  return (
    <Phone tone="bg-ink-soft">
      <div className="flex h-[300px] flex-col items-center justify-center text-center">
        <div className="grid grid-cols-9 gap-[2px] rounded-xl bg-cream p-3">
          {bits.split("").map((b, i) => (
            <span key={i} className={`h-2.5 w-2.5 ${b === "1" ? "bg-ink" : "bg-cream"}`} />
          ))}
        </div>
        <div className="mt-4 font-display text-sm font-bold text-cream">Scan for menu</div>
        <div className="mt-1 rounded-full border border-ink-line px-3 py-1 text-fizz">
          sharmachai.in
        </div>
        <div className="mt-3 text-steam">or share the link on WhatsApp, Instagram, Google Maps</div>
      </div>
    </Phone>
  );
}

export default function MenuShowcase() {
  return (
    <section id="menu" className="border-b border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Your menu, online — included
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          A QR menu that takes WhatsApp orders. On your own domain. Free.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-steam">
          Others sell this as a separate “online ordering” product. In Fizz
          it&apos;s one switch. Guests scan, browse, order — no app, no
          Swiggy commission, no 20-page PDF on WhatsApp.
        </p>

        <div aria-hidden className="mt-12 grid gap-8 sm:grid-cols-3">
          <div>
            <WelcomeMock />
            <p className="mt-4 text-center text-sm text-steam">
              <span className="font-semibold text-cream">Welcome screen.</span> Logo, cover, hours, 4 layouts.
            </p>
          </div>
          <div>
            <MenuMock />
            <p className="mt-4 text-center text-sm text-steam">
              <span className="font-semibold text-cream">Live menu.</span> Table QR, search, cart, WhatsApp order.
            </p>
          </div>
          <div>
            <QrMock />
            <p className="mt-4 text-center text-sm text-steam">
              <span className="font-semibold text-cream">QR + your domain.</span> Print frames, share anywhere.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.k} className="rounded-fizz border border-ink-line bg-ink-soft p-6">
              <h3 className="font-display text-lg font-bold">{f.k}</h3>
              <p className="mt-2 text-sm text-steam">{f.v}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-steam">
          Menu edits in the POS show on the QR menu. Mark an item unavailable
          and it disappears from the guest&apos;s phone too.
        </p>
      </div>
    </section>
  );
}
