import { getMenuTheme, themeVars } from "@/lib/store/menu-themes";
import { DEFAULT_WELCOME, type WelcomeConfig, type WelcomeCard } from "@/lib/store/welcome";
import { WifiCard, CardShell, CardIcon, SocialIcon, ParallaxDriver } from "./WelcomeCards";
import Lottie from "./Lottie";

// The welcome screen at /m/[slug]: cover, name, table badge, a stack of cards
// (menu, review, Wi-Fi, call, WhatsApp, custom), socials. Plain props (no
// server imports) so the admin modal can render the same component as a live
// preview of unsaved settings. Painted with the same theme vars as the menu.
export type WelcomeProps = {
  slug: string;
  store: {
    name: string;
    menuTagline: string | null;
    logoUrl: string | null;
    phone: string | null;
    menuTheme: string;
    menuAccent: string;
    menuWelcome: WelcomeConfig | null;
  };
  whatsapp: string | null;
  table: string | null;
  viewOnly?: string;
  /** Admin preview: fills its box instead of the viewport, links go nowhere. */
  embedded?: boolean;
};

export default function Welcome({ slug, store, whatsapp, table, viewOnly, embedded }: WelcomeProps) {
  const w = store.menuWelcome ?? DEFAULT_WELCOME;
  const theme = getMenuTheme(store.menuTheme);
  const accent = store.menuAccent || theme.accent;
  const qs = new URLSearchParams();
  if (table) qs.set("t", table);
  if (viewOnly) qs.set("viewOnly", viewOnly);
  const menuHref = `/m/${slug}/menu${qs.size ? `?${qs}` : ""}`;

  // Where each card goes. null = nothing to point at (no phone saved…): skip it.
  const hrefFor = (c: WelcomeCard): string | null => {
    switch (c.kind) {
      case "menu":
        return menuHref;
      case "call":
        return store.phone ? `tel:${store.phone.replace(/[^\d+]/g, "")}` : null;
      case "whatsapp":
        return whatsapp
          ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${store.name}!${table ? ` Table ${table}.` : ""}`)}`
          : null;
      case "wifi":
        return c.ssid ? "#" : null;
      default:
        return c.href ?? null;
    }
  };
  const cards = w.cards.filter((c) => c.on).map((c) => [c, hrefFor(c)] as const).filter(([, h]) => h);

  return (
    <main
      className={`relative overflow-hidden ${embedded ? "min-h-full [&_a]:pointer-events-none" : "min-h-dvh"} bg-[var(--m-bg)] text-[var(--m-text)]`}
      style={themeVars(theme, accent)}
    >
      <ParallaxDriver />
      {/* Ambient accent orbs behind the page; they trail the scroll. */}
      <div className="wl-px pointer-events-none absolute inset-0 overflow-hidden" style={{ "--wl-rate": 0.6 } as React.CSSProperties} aria-hidden>
        <span className="wl-orb wl-orb-a -left-20 top-10 h-64 w-64" />
        <span className="wl-orb wl-orb-b -right-24 bottom-20 h-72 w-72" />
      </div>
      <div className={`relative mx-auto flex max-w-md flex-col px-4 pb-8 pt-4 ${embedded ? "min-h-full" : "min-h-dvh sm:pt-8"}`}>
        {/* Hero card: cover image (or a quiet accent wash), logo, name, tagline, table. */}
        <section
          className="wl-in relative overflow-hidden"
          style={{ "--i": 0, borderRadius: `calc(var(--m-radius) + 6px)`, backgroundColor: "var(--m-surface)" } as React.CSSProperties}
        >
          <div className="relative aspect-[4/3] w-full">
            <div className="wl-px absolute -inset-y-24 inset-x-0" style={{ "--wl-rate": 0.35 } as React.CSSProperties}>
              {w.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.coverUrl} alt="" className="wl-cover absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(120% 90% at 80% 10%, ${accent}55, transparent 60%), var(--m-surface)` }}
                >
                  <CupArt accent={accent} />
                </div>
              )}
              <Bubbles />
            </div>
            {w.heroLottie && (
              <Lottie src={w.heroLottie} className="pointer-events-none absolute inset-0 h-full w-full" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5">
              <div
                className="wl-logo flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-[var(--m-bg)] text-2xl font-bold"
                style={{ borderColor: accent, fontFamily: theme.display }}
              >
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/api/logo" alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <span style={{ color: accent }}>{store.name.trim().charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 text-white">
                <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight" style={{ fontFamily: theme.display }}>
                  {store.name}
                </h1>
                {store.menuTagline && <p className="mt-0.5 truncate text-[15px] italic text-white/80">{store.menuTagline}</p>}
                {table && (
                  <span
                    className="wl-badge mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--m-bg)]"
                    style={{ backgroundColor: accent }}
                  >
                    Table {table}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="wl-in wl-rule mx-6 mt-4" style={{ "--i": 1 } as React.CSSProperties} aria-hidden />

        {/* Cards. First one is the headline action (accent-tinted). */}
        <ul className="mt-4 flex flex-col gap-3">
          {cards.map(([c, href], i) =>
            c.kind === "wifi" ? (
              <WifiCard key={c.id} card={c} accent={accent} index={i + 1} />
            ) : (
              <li key={c.id} className="wl-in" style={{ "--i": i + 1 } as React.CSSProperties}>
                <CardShell
                  href={href!}
                  primary={i === 0}
                  accent={accent}
                  external={c.kind === "review" || c.kind === "link" || c.kind === "whatsapp"}
                  icon={<CardIcon kind={c.kind} />}
                  lottie={c.lottie || undefined}
                  title={c.title}
                  subtitle={c.subtitle}
                />
              </li>
            ),
          )}
          {cards.length === 0 && (
            <li className="wl-in" style={{ "--i": 1 } as React.CSSProperties}>
              <CardShell href={menuHref} primary accent={accent} icon={<CardIcon kind="menu" />} title="View Menu" subtitle="See what's pouring" />
            </li>
          )}
        </ul>

        {w.socials.length > 0 && (
          <div className="wl-in mt-8 flex justify-center gap-3" style={{ "--i": cards.length + 1 } as React.CSSProperties}>
            {w.socials.map((u, i) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noreferrer"
                className="wl-social flex h-12 w-12 items-center justify-center rounded-full border transition-colors hover:border-[var(--m-accent)] hover:text-[var(--m-accent)]"
                style={{ "--i": i, borderColor: "var(--m-line)", color: "var(--m-text)" } as React.CSSProperties}
              >
                <SocialIcon url={u} />
              </a>
            ))}
          </div>
        )}

        <footer className="wl-in mt-auto pt-10 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--m-muted)]" style={{ "--i": cards.length + 2 } as React.CSSProperties}>
          {store.name} · Powered by{" "}
          <span className="font-wordmark font-bold normal-case tracking-normal text-[var(--m-text)]">
            Fi<span style={{ color: accent }}>zz</span>
            <span className="align-super text-[0.7em]" style={{ color: accent }}>●</span>
          </span>
        </footer>
      </div>
    </main>
  );
}

// Deterministic spread so SSR and client markup agree; the rise is pure CSS.
const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  size: 5 + ((i * 37) % 18),
  left: (i * 53) % 100,
  duration: 5 + ((i * 31) % 6),
  delay: (i * 17) % 7,
}));

function Bubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="wl-bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDuration: `${b.duration}s`,
            animationDelay: `-${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Cup with steam for cafés with no cover photo yet — still looks dressed.
function CupArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 320 240" className="absolute inset-0 h-full w-full" aria-hidden>
      <g className="wl-ripple" style={{ transformBox: "fill-box" }}>
        <ellipse cx="200" cy="150" rx="70" ry="22" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="2" />
      </g>
      <g className="wl-cup">
        {/* saucer */}
        <ellipse cx="200" cy="150" rx="56" ry="14" fill={accent} fillOpacity="0.25" />
        {/* cup body */}
        <path d="M160 92h80l-8 50a14 14 0 0 1-14 12h-36a14 14 0 0 1-14-12z" fill={accent} fillOpacity="0.9" />
        <ellipse cx="200" cy="92" rx="40" ry="10" fill={accent} />
        <ellipse cx="200" cy="92" rx="30" ry="6" fill="#1b120d" fillOpacity="0.7" />
        {/* handle */}
        <path d="M240 104c18 0 24 10 22 20s-12 16-24 16" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        {/* steam */}
        {[-14, 0, 14].map((dx, i) => (
          <path
            key={i}
            className="wl-steam"
            style={{ animationDelay: `${i * 0.9}s` }}
            d={`M${200 + dx} 78c-6-8 6-14 0-22s6-12 0-18`}
            fill="none"
            stroke={accent}
            strokeOpacity="0.8"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
