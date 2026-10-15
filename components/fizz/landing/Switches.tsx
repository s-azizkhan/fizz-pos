import { FEATURES } from "@/lib/store/features";

// The differentiator: every module is a switch. A chai stall runs billing
// only; a pizza counter turns on recipes + margins; a cloud kitchen adds KOT.
// Pulled straight from the real feature registry so the page never lies.

const ALWAYS = ["POS billing", "Orders", "Menu", "Team & roles"];

// Which switches are drawn ON in the mock switchboard (decorative).
const DEMO_ON = new Set(["inventory", "margins", "report", "printers", "expenses"]);

const PRESETS: { who: string; on: string[] }[] = [
  { who: "Chai / juice / ice cream stall", on: ["dailySales", "expenses", "report"] },
  { who: "Pizza / burger / momo counter", on: ["inventory", "margins", "analytics", "printers"] },
  { who: "Cloud kitchen / multi-brand", on: ["kot", "publicMenu", "customers", "printers"] },
];

export default function Switches() {
  const list = FEATURES.filter((f) => f.key !== "docs");
  return (
    <section id="switches" className="border-b border-ink-line bg-ink-soft/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Your counter, your switches
        </div>
        <h2 className="max-w-[20ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
          Start with billing. Switch on the rest when you&apos;re ready.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-steam">
          Big POS makes a chai stall learn a 40-screen ERP. Fizz doesn&apos;t.
          Every module is a toggle in settings — off means it vanishes from the
          app. No modules to buy, no add-on pricing, no training week.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Switchboard */}
          <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
            <div className="flex flex-wrap gap-2">
              {ALWAYS.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-ink-line bg-ink px-3.5 py-1.5 text-sm text-cream"
                >
                  {a} <span className="text-steam">· always on</span>
                </span>
              ))}
            </div>
            <ul aria-hidden className="mt-6 divide-y divide-ink-line">
              {list.map((f) => {
                const on = DEMO_ON.has(f.key);
                return (
                  <li key={f.key} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <div className="font-display font-semibold text-cream">{f.label}</div>
                      <div className="text-sm text-steam">{f.hint}</div>
                    </div>
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full border ${
                        on ? "border-fizz bg-fizz" : "border-ink-line bg-ink"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full ${
                          on ? "left-[22px] bg-ink" : "left-0.5 bg-steam"
                        }`}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-5">
            {PRESETS.map((p) => (
              <div key={p.who} className="rounded-fizz border border-ink-line bg-ink-soft p-6">
                <div className="font-display text-lg font-bold">{p.who}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.on.map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-fizz/50 bg-fizz/10 px-3 py-1 text-sm font-semibold text-fizz"
                    >
                      {FEATURES.find((x) => x.key === k)?.label ?? k}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-steam">
                  Billing + these. Everything else stays out of the way.
                </p>
              </div>
            ))}
            <p className="text-xs text-steam">
              Same price whatever you switch on. Change your mind any day.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
