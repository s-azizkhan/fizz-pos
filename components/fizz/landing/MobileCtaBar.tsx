import { WA_HREF } from "./contact";

// Indian owners read this on a phone. Keep the two actions that convert —
// WhatsApp and the form — one thumb away at all times. Hidden on md+.
export default function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-line bg-ink/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <div className="grid grid-cols-2 gap-3">
        <a
          href={WA_HREF("Hi, I run a food counter and want to see Fizz.")}
          target="_blank"
          rel="noopener"
          className="flex items-center justify-center gap-2 rounded-fizz border border-ink-line bg-ink-soft py-3 text-sm font-semibold text-cream"
        >
          <span className="text-bubble">●</span> WhatsApp
        </a>
        <a
          href="#waitlist"
          className="flex items-center justify-center rounded-fizz bg-fizz py-3 text-sm font-semibold text-ink"
        >
          Get early access
        </a>
      </div>
    </div>
  );
}
