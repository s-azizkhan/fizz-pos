// The hero visual: the 11pm conversation every owner has — with their khata,
// their manager, or themselves — answered by Fizz's daily report and margins
// screens. Pure markup + CSS delays (deterministic, SSR-safe). Decorative.

type Line =
  | { who: "you"; text: string; t: string }
  | { who: "fizz"; title: string; rows: [string, string][]; note?: string; t: string }
  | { who: "typing" };

const THREAD: Line[] = [
  { who: "you", text: "Aaj kitna bana?", t: "11:02 pm" },
  {
    who: "fizz",
    title: "Today · Tue 14 Oct",
    rows: [
      ["Sales", "₹18,420"],
      ["Orders", "142"],
      ["Cost", "₹7,180"],
      ["Profit", "₹11,240 · 61%"],
    ],
    note: "Busiest 8–9 pm. UPI 71%. 2 voids, both by Raju.",
    t: "11:02 pm",
  },
  { who: "you", text: "Momos chal rahe hain?", t: "11:03 pm" },
  {
    who: "fizz",
    title: "Veg momos · #1 today",
    rows: [
      ["Plates", "86"],
      ["Margin", "58%"],
      ["Momo sheets", "2 days left"],
    ],
    note: "Reorder by Thursday — weekend rush.",
    t: "11:03 pm",
  },
  { who: "typing" },
];

// Seconds between bubbles. Long enough to read, short enough to feel alive.
const STEP = 1.1;

export default function HeroChat() {
  return (
    <div aria-hidden className="w-full max-w-[400px]">
      <div className="rounded-fizz border border-ink-line bg-ink-soft/80 backdrop-blur">
        {/* Thread header */}
        <div className="flex items-center gap-3 border-b border-ink-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fizz font-wordmark text-lg font-bold text-ink">
            F
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-cream">
              Fi<span className="text-fizz">zz</span> · your counter
            </div>
            <div className="flex items-center gap-1.5 text-xs text-steam">
              <span className="h-1.5 w-1.5 rounded-full bg-fizz" /> live
            </div>
          </div>
        </div>

        {/* Thread */}
        <div className="flex flex-col gap-3 px-5 py-5">
          {THREAD.map((l, i) => {
            const delay = { animationDelay: `${0.4 + i * STEP}s` };
            if (l.who === "you") {
              return (
                <div key={i} className="fizz-chat-in flex flex-col items-end" style={delay}>
                  <div className="max-w-[80%] rounded-fizz rounded-br-md bg-fizz px-4 py-2.5 font-display text-[15px] font-semibold text-ink">
                    {l.text}
                  </div>
                  <span className="mt-1 text-[10px] text-steam">{l.t}</span>
                </div>
              );
            }
            if (l.who === "typing") {
              return (
                <div key={i} className="fizz-chat-in" style={delay}>
                  <div className="fizz-typing inline-flex items-center gap-1 rounded-fizz rounded-bl-md border border-ink-line bg-ink px-4 py-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-steam" />
                    <span className="h-1.5 w-1.5 rounded-full bg-steam" />
                    <span className="h-1.5 w-1.5 rounded-full bg-steam" />
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="fizz-chat-in flex flex-col items-start" style={delay}>
                <div className="w-[88%] rounded-fizz rounded-bl-md border border-ink-line bg-ink px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fizz">
                    {l.title}
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {l.rows.map(([k, v], j) => (
                      <div key={k} className="contents">
                        <dt className="text-steam">{k}</dt>
                        <dd
                          className={`text-right font-display font-semibold ${
                            j === l.rows.length - 1 ? "text-fizz" : "text-cream"
                          }`}
                        >
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {l.note && (
                    <p className="mt-2.5 border-t border-ink-line pt-2 text-xs text-steam">
                      {l.note}
                    </p>
                  )}
                </div>
                <span className="mt-1 text-[10px] text-steam">{l.t}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-steam">
        Illustration. The numbers come from your Daily report and Margins screens.
      </p>
    </div>
  );
}
