import { menuPath } from "@/lib/store/menu-path";
import { getMenuTheme, themeVars } from "@/lib/store/menu-themes";
import { DEFAULT_WELCOME, type WelcomeConfig, type WelcomeCard } from "@/lib/store/welcome";
import { WifiCard, CardShell, CardIcon, SocialIcon, ParallaxDriver } from "./WelcomeCards";
import Lottie from "./Lottie";
import ShareButton from "./ShareButton";

// The welcome screen at /m/[slug]: cover, name, table badge, a stack of cards
// (menu, review, Wi-Fi, call, WhatsApp, custom), socials. Plain props (no
// server imports) so the admin modal can render the same component as a live
// preview of unsaved settings. Painted with the same theme vars as the menu.
export type WelcomeProps = {
  slug: string;
  store: {
    id: string;
    name: string;
    menuTagline: string | null;
    logoUrl: string | null;
    phone: string | null;
    menuTheme: string;
    menuAccent: string;
    menuWelcome: WelcomeConfig | null;
    openingTime: string;
    closingTime: string;
    timezone: string;
  };
  whatsapp: string | null;
  table: string | null;
  viewOnly?: string;
  /** Admin preview: fills its box instead of the viewport, links go nowhere. */
  embedded?: boolean;
};

// "Open · till 22:00" / "Opens at 08:00", in the store's own timezone.
function openStatus(opening: string, closing: string, tz: string): { open: boolean; label: string } {
  let hm = "";
  try {
    hm = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  } catch {
    hm = new Date().toTimeString().slice(0, 5);
  }
  const overnight = closing < opening; // e.g. 18:00 → 02:00
  const open = overnight ? hm >= opening || hm < closing : hm >= opening && hm < closing;
  const to12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
  };
  return open ? { open, label: `Open · till ${to12(closing)}` } : { open, label: `Closed · opens ${to12(opening)}` };
}

export default function Welcome({ slug, store, whatsapp, table, viewOnly, embedded }: WelcomeProps) {
  const w = store.menuWelcome ?? DEFAULT_WELCOME;
  const status = openStatus(store.openingTime, store.closingTime, store.timezone);
  const theme = getMenuTheme(store.menuTheme);
  const accent = store.menuAccent || theme.accent;
  const qs = new URLSearchParams();
  if (table) qs.set("t", table);
  if (viewOnly) qs.set("viewOnly", viewOnly);
  const menuHref = `${menuPath(slug, "/menu")}${qs.size ? `?${qs}` : ""}`;
  const gamesHref = `${menuPath(slug, "/games")}${qs.size ? `?${qs}` : ""}`;

  // Where each card goes. null = nothing to point at (no phone saved…): skip it.
  const hrefFor = (c: WelcomeCard): string | null => {
    switch (c.kind) {
      case "menu":
        return menuHref;
      case "games":
        return gamesHref;
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

  const L = w.layout ?? "cover";
  const poster = L === "poster";
  const ink = poster ? "text-white" : "text-[var(--m-text)]";
  const mutedCls = poster ? "text-white/70" : "text-[var(--m-muted)]";

  const logo = (size: string, cls = "") => (
    <div
      className={`wl-logo flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-[var(--m-bg)] font-bold ${cls}`}
      style={{ borderColor: accent, fontFamily: theme.display }}
    >
      {store.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/logo?s=${store.id}`} alt={`${store.name} logo`} className="h-full w-full object-cover" />
      ) : (
        <span style={{ color: accent }}>{store.name.trim().charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
  const badges = (center = false) => (
    <span className={`mt-2.5 flex flex-wrap items-center gap-2 ${center ? "justify-center" : ""}`}>
      {table && (
        <span
          className="wl-badge inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--m-bg)]"
          style={{ backgroundColor: accent }}
        >
          Table {table}
        </span>
      )}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
          L === "minimal" ? "border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-text)]" : "border-white/20 bg-black/35 text-white/90"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${status.open ? "bg-[#4ADE80]" : "bg-[#F87171]"}`} />
        {status.label}
      </span>
      <ShareButton
        title={store.name}
        text={store.menuTagline ? `${store.name} — ${store.menuTagline}` : `${store.name} menu`}
        path={menuPath(slug)}
        accent={accent}
        glass={L !== "minimal"}
      />
    </span>
  );
  // Cover art: photo, or the accent wash + cup when there's none.
  const art = (
    <>
      {w.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={w.coverUrl} alt={`${store.name}`} className="wl-cover absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(120% 90% at 80% 10%, ${accent}55, transparent 60%), var(--m-surface)` }}
        >
          <CupArt accent={accent} />
        </div>
      )}
      <Bubbles />
    </>
  );
  const heroLottie = w.heroLottie && <Lottie src={w.heroLottie} className="pointer-events-none absolute inset-0 h-full w-full" />;

  const cardList = (
    <ul className={`mt-4 ${L === "tiles" ? "grid grid-cols-2 gap-2.5" : L === "minimal" ? "flex flex-col" : "flex flex-col gap-2.5"}`}>
      {cards.map(([c, href], i) =>
        c.kind === "wifi" ? (
          <WifiCard key={c.id} card={c} accent={accent} index={i + 1} variant={L === "tiles" && i === 0 ? "cover" : L} span={L === "tiles" && i === 0} />
        ) : (
          <li key={c.id} className={`wl-in ${L === "tiles" && i === 0 ? "col-span-2" : ""}`} style={{ "--i": i + 1 } as React.CSSProperties}>
            <CardShell
              href={href!}
              primary={i === 0}
              accent={accent}
              variant={L === "tiles" && i === 0 ? "cover" : L}
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
        <li className={`wl-in ${L === "tiles" ? "col-span-2" : ""}`} style={{ "--i": 1 } as React.CSSProperties}>
          <CardShell href={menuHref} primary accent={accent} variant={L} icon={<CardIcon kind="menu" />} title="View Menu" subtitle="See what's pouring" />
        </li>
      )}
    </ul>
  );

  return (
    <main
      className={`relative overflow-hidden [-webkit-tap-highlight-color:transparent] ${embedded ? "min-h-full [&_a]:pointer-events-none" : "min-h-dvh"} bg-[var(--m-bg)] ${ink}`}
      style={themeVars(theme, accent)}
    >
      <ParallaxDriver />
      {poster ? (
        /* Poster: the photo is the page. Dark wash so white type reads. */
        <div className="wl-px absolute inset-x-0 -top-24 bottom-0" style={{ "--wl-rate": 0.3 } as React.CSSProperties} aria-hidden>
          <div className="absolute inset-0">{art}</div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" />
        </div>
      ) : (
        /* Ambient accent orb behind the page; it trails the scroll. */
        <div className="wl-px pointer-events-none absolute inset-0 overflow-hidden" style={{ "--wl-rate": 0.6 } as React.CSSProperties} aria-hidden>
          <span className="wl-orb wl-orb-a -right-16 -top-10 h-72 w-72" />
        </div>
      )}
      <div className={`relative mx-auto flex max-w-md flex-col px-4 ${embedded ? "min-h-full pb-8 pt-4" : "min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:pt-8"}`}>
        {(L === "cover" || L === "tiles") && (
          /* Hero card: photo, logo, name, tagline, badges. */
          <section
            className="wl-in relative overflow-hidden"
            style={{ "--i": 0, borderRadius: `calc(var(--m-radius) + 6px)`, backgroundColor: "var(--m-surface)" } as React.CSSProperties}
          >
            <div className={`relative w-full ${L === "tiles" ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
              <div className="wl-px absolute -inset-y-24 inset-x-0" style={{ "--wl-rate": 0.35 } as React.CSSProperties}>{art}</div>
              {heroLottie}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5">
                {logo("h-16 w-16 text-2xl")}
                <div className="min-w-0 text-white">
                  <h1 className="truncate text-[28px] font-bold leading-none tracking-tight" style={{ fontFamily: theme.display }}>
                    {store.name}
                  </h1>
                  {store.menuTagline && <p className="mt-1 truncate text-[14px] text-white/75">{store.menuTagline}</p>}
                  {badges()}
                </div>
              </div>
            </div>
          </section>
        )}

        {poster && (
          /* Poster hero: type sits on the photo, centered, with air above. */
          <section className="wl-in relative flex flex-col items-center pb-2 pt-10 text-center" style={{ "--i": 0 } as React.CSSProperties}>
            {heroLottie && <div className="pointer-events-none absolute inset-x-0 -top-10 h-56">{heroLottie}</div>}
            {logo("h-20 w-20 text-3xl", "shadow-lg")}
            <h1 className="mt-4 text-[34px] font-bold leading-none tracking-tight" style={{ fontFamily: theme.display }}>
              {store.name}
            </h1>
            {store.menuTagline && <p className="mt-2 text-[15px] text-white/75">{store.menuTagline}</p>}
            {badges(true)}
          </section>
        )}

        {L === "minimal" && (
          /* Minimal: big mark, name, one line. No photo at all. */
          <section className="wl-in flex flex-col items-center pb-2 pt-8 text-center" style={{ "--i": 0 } as React.CSSProperties}>
            <div className="relative">
              {heroLottie && <div className="pointer-events-none absolute -inset-10">{heroLottie}</div>}
              {logo("h-24 w-24 text-4xl")}
            </div>
            <h1 className="mt-5 text-[32px] font-bold leading-none tracking-tight" style={{ fontFamily: theme.display }}>
              {store.name}
            </h1>
            {store.menuTagline && <p className={`mt-2 text-[15px] ${mutedCls}`}>{store.menuTagline}</p>}
            {badges(true)}
          </section>
        )}

        {L !== "minimal" && <div className="wl-in wl-rule mx-6 mt-4" style={{ "--i": 1 } as React.CSSProperties} aria-hidden />}
        {L === "minimal" && <div className="wl-in mx-auto mt-6 h-px w-16" style={{ "--i": 1, backgroundColor: accent } as React.CSSProperties} aria-hidden />}

        {cardList}

        {w.socials.length > 0 && (
          <div className="wl-in mt-8 flex justify-center gap-3" style={{ "--i": cards.length + 1 } as React.CSSProperties}>
            {w.socials.map((u, i) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noreferrer"
                className="wl-social flex h-12 w-12 items-center justify-center rounded-full border transition-colors hover:border-[var(--m-accent)] hover:text-[var(--m-accent)]"
                style={{ "--i": i, borderColor: poster ? "rgba(255,255,255,0.25)" : "var(--m-line)", color: poster ? "#fff" : "var(--m-text)" } as React.CSSProperties}
              >
                <SocialIcon url={u} />
              </a>
            ))}
          </div>
        )}

        <footer className={`wl-in mt-auto pt-10 text-center text-[11px] uppercase tracking-[0.2em] ${mutedCls}`} style={{ "--i": cards.length + 2 } as React.CSSProperties}>
          {store.name} · Powered by{" "}
          <span className={`font-wordmark font-bold normal-case tracking-normal ${ink}`}>
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

// Cup with steam for stores with no cover photo yet — still looks dressed.
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
