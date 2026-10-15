import { PHONE_DISPLAY, TEL_HREF } from "./contact";
import { PlusIcon } from "@/components/fizz/dashboard/icons";

// Objection handling. Native <details> — no JS.
const QA = [
  {
    q: "I only sell chai and snacks. Isn't this too much for me?",
    a: "No. Switch off Inventory, Margins, KOT and whatever else you don't need — they disappear from the app. You get a 3-tap billing screen with UPI QR and a day-end total. Turn the rest on later, or never.",
  },
  {
    q: "I already have a billing software.",
    a: "Most billing apps stop at the bill. They don't know you used 160 g of cheese, or that milk will finish tonight, or what margin that bill made. Fizz does the bill and the counting. If yours already does both, keep it.",
  },
  {
    q: "What does it cost?",
    a: "Nothing during early access. No card, no setup fee, no per-feature add-ons. When we start charging, founding counters get told first and get the lowest rate we'll ever offer.",
  },
  {
    q: "Do I need to buy hardware?",
    a: "No. Fizz runs in the browser on any Android phone, tablet, or laptop you already own. UPI payment is a QR on screen. Receipts print to Bluetooth or USB thermal printers, or go on WhatsApp.",
  },
  {
    q: "My staff isn't tech-savvy.",
    a: "If they can use WhatsApp, they can bill on Fizz. Big buttons, your menu, three taps per order. Staff get their own login — they see the POS, not your profits.",
  },
  {
    q: "Setting up recipes sounds like work.",
    a: "It's optional. Without it Fizz is still a fast POS. With it — about an hour for a typical 30-item menu, done with you on a WhatsApp call — the numbers become real: stock, margin, reorder alerts.",
  },
  {
    q: "Is GST handled?",
    a: "Yes. Set your rate once; every bill shows it. Day-end and monthly totals come out ready for your CA.",
  },
  {
    q: "Can customers order from a QR or my own website?",
    a: "Yes. Switch on Public menu: you get a shareable link, a QR for the counter, and it runs on your own domain if you have one. Orders land in the same POS.",
  },
  {
    q: "Is my data safe? Can staff see my numbers?",
    a: "Roles: admin, manager, staff. Staff see the counter only. Your data lives in your account, encrypted in transit, never sold or shared.",
  },
  {
    q: "What about Swiggy / Zomato orders?",
    a: "Ring them in as a separate payment type so stock deducts and the day-end still matches. Direct aggregator sync isn't there yet — ask us and we'll tell you honestly where it is on the list.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="border-b border-ink-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Straight answers
          </div>
          <h2 className="max-w-[16ch] font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
            Things counter owners ask us first.
          </h2>
          <p className="mt-4 max-w-[40ch] text-lg text-steam">
            Not covered? Call or WhatsApp the founder directly.
          </p>
          <a
            href={TEL_HREF}
            className="mt-4 inline-block font-display text-2xl font-bold tracking-tight text-cream transition-colors hover:text-fizz"
          >
            {PHONE_DISPLAY}
          </a>
        </div>

        <div className="divide-y divide-ink-line rounded-fizz border border-ink-line bg-ink-soft">
          {QA.map((x) => (
            <details key={x.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-cream">
                {x.q}
                <PlusIcon className="h-5 w-5 shrink-0 text-fizz transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-[60ch] text-steam">{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
