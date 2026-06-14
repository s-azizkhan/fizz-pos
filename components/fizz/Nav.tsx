"use client";

import { useUi } from "@/lib/store/ui";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#how", label: "How it works" },
  { href: "#why", label: "Why Fizz" },
];

export default function Nav() {
  const { mobileNavOpen, toggleMobileNav, closeMobileNav } = useUi();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="font-display text-2xl font-bold tracking-tight">
          Fi<span className="text-fizz">zz</span>
          <span className="align-super text-xs text-bubble">●</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-steam transition-colors hover:text-cream"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-sm text-steam transition-colors hover:text-cream"
          >
            Sign in
          </a>
          <a
            href="#waitlist"
            className="rounded-full bg-fizz px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-105"
          >
            Get early access
          </a>
        </div>

        <button
          className="text-cream md:hidden"
          onClick={toggleMobileNav}
          aria-label="Toggle menu"
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? "✕" : "☰"}
        </button>
      </nav>

      {mobileNavOpen && (
        <div className="border-t border-ink-line px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={closeMobileNav}
                className="text-sm text-steam hover:text-cream"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={closeMobileNav}
              className="text-sm text-steam hover:text-cream"
            >
              Sign in
            </a>
            <a
              href="#waitlist"
              onClick={closeMobileNav}
              className="rounded-full bg-fizz px-4 py-2 text-center text-sm font-semibold text-ink"
            >
              Get early access
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
