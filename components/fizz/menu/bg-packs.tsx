import type { ReactNode } from "react";

// Decorative background packs for the printable menu. Each pack is a set of
// line-icon glyphs scattered as a faint watermark behind the page content.
// Selected independently of the visual style. Positions are deterministic
// (no random) so SSR and client markup match — same rule as the hero bubbles.

// Each glyph draws inside a 0 0 24 24 viewBox; the layer supplies the <svg>
// wrapper with stroke=currentColor, fill=none.
type Glyph = () => ReactNode;

export type MenuBgPack = {
  id: string;
  name: string;
  blurb: string;
  glyphs: Glyph[];
};

/* ---------- Café / food ---------- */
const Pizza: Glyph = () => (
  <>
    <path d="M3 7l9 15 9-15z" />
    <path d="M3 7c5-2.5 13-2.5 18 0" />
    <circle cx="10" cy="11" r="1" />
    <circle cx="14" cy="12.5" r="1" />
    <circle cx="11.5" cy="16" r="1" />
  </>
);
const Burger: Glyph = () => (
  <>
    <path d="M4 10c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    <path d="M4 10h16" />
    <path d="M5.5 13.5h13" />
    <path d="M4 13.5c0 3 3.6 5 8 5s8-2 8-5" />
    <path d="M8 7h.01M11 6.4h.01M14 6.7h.01" />
  </>
);
const Fries: Glyph = () => (
  <>
    <path d="M6.5 10l1.6 11h7.8l1.6-11z" />
    <path d="M6.5 10h11" />
    <path d="M9 10V4M12 10V2.5M15 10V5" />
  </>
);
const Wrap: Glyph = () => (
  <>
    <path d="M5 13.5L13.5 5a3 3 0 014.2 4.2L9.2 17.7A3 3 0 015 13.5z" />
    <path d="M8.5 10l3.5 3.5" />
    <path d="M11 7.5l3.5 3.5" />
  </>
);
const Mocktail: Glyph = () => (
  <>
    <path d="M4 5h16l-8 9z" />
    <path d="M12 14v6" />
    <path d="M8 20h8" />
    <path d="M15 5l3-3" />
    <circle cx="18" cy="2.5" r="1" />
  </>
);

/* ---------- Brew / coffee ---------- */
const Cup: Glyph = () => (
  <>
    <path d="M5 8h12v6a4 4 0 01-4 4H9a4 4 0 01-4-4z" />
    <path d="M17 9.5a3 3 0 010 5.5" />
    <path d="M9 5c1-1.6 1-2.4 0-4M13 5c1-1.6 1-2.4 0-4" />
  </>
);
const Bean: Glyph = () => (
  <>
    <path d="M12 4c-4 0-6 3.6-6 8s2 8 6 8 6-3.6 6-8-2-8-6-8z" />
    <path d="M12 5c-3 4-3 10 0 14" />
  </>
);
const Mug: Glyph = () => (
  <>
    <path d="M5 7h11v9a3 3 0 01-3 3H8a3 3 0 01-3-3z" />
    <path d="M16 9.5a3 3 0 010 5" />
    <path d="M5 7l11 0" />
  </>
);
const Kettle: Glyph = () => (
  <>
    <path d="M5 13a7 5.5 0 0114 0v2a3 3 0 01-3 3H8a3 3 0 01-3-3z" />
    <path d="M19 11l3-3" />
    <path d="M8.5 8c3-3.5 4-3.5 7 0" />
    <path d="M11 7h2" />
  </>
);
const Steam: Glyph = () => (
  <>
    <path d="M8 20c-1.5-2.5 1.5-4 0-6.5" />
    <path d="M12 20c-1.5-2.5 1.5-4 0-6.5" />
    <path d="M16 20c-1.5-2.5 1.5-4 0-6.5" />
  </>
);

/* ---------- Bakery ---------- */
const Croissant: Glyph = () => (
  <>
    <path d="M4 16c4-9 12-9 16 0-5-3-11-3-16 0z" />
    <path d="M8 13l-1.5 3M12 12.2v3.5M16 13l1.5 3" />
  </>
);
const Cupcake: Glyph = () => (
  <>
    <path d="M6 11a6 6 0 0112 0z" />
    <path d="M7 11h10l-1.6 8H8.6z" />
    <path d="M10 13.5v4.5M12 13v5.5M14 13.5v4.5" />
    <circle cx="12" cy="6" r="1.4" />
  </>
);
const Donut: Glyph = () => (
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M8 9l.01.01M15 8l.01.01M16.5 13l.01.01M9 16l.01.01" />
  </>
);
const Cookie: Glyph = () => (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M9.5 9l.01.01M14.5 10l.01.01M10 14l.01.01M15 14.5l.01.01M12 12l.01.01" />
  </>
);
const Loaf: Glyph = () => (
  <>
    <path d="M4 13a8 6 0 0116 0v5H4z" />
    <path d="M8 10l1.5 3M12 9.5l1.5 3.5M16 10l-1.5 3" />
  </>
);

/* ---------- Bubbles (fizz motif) ---------- */
const Bubble1: Glyph = () => <circle cx="12" cy="12" r="7" />;
const Bubble2: Glyph = () => (
  <>
    <circle cx="9" cy="13" r="5" />
    <circle cx="16" cy="8" r="3" />
  </>
);
const Bubble3: Glyph = () => (
  <>
    <circle cx="8" cy="14" r="4" />
    <circle cx="15" cy="15" r="3" />
    <circle cx="13" cy="8" r="2.5" />
  </>
);

export const MENU_BG_PACKS: MenuBgPack[] = [
  { id: "none", name: "None", blurb: "Clean — no background graphics.", glyphs: [] },
  {
    id: "cafe",
    name: "Street Food",
    blurb: "Pizza, burger, fries, wrap, mocktail.",
    glyphs: [Pizza, Burger, Fries, Wrap, Mocktail],
  },
  {
    id: "brew",
    name: "Coffee Bar",
    blurb: "Cups, beans, kettle, steam.",
    glyphs: [Cup, Bean, Mug, Kettle, Steam],
  },
  {
    id: "bakery",
    name: "Bakery",
    blurb: "Croissant, cupcake, donut, cookie, loaf.",
    glyphs: [Croissant, Cupcake, Donut, Cookie, Loaf],
  },
  {
    id: "bubbles",
    name: "Fizz Bubbles",
    blurb: "Effervescent rising bubbles. On brand.",
    glyphs: [Bubble1, Bubble2, Bubble3, Bubble1, Bubble2],
  },
];

export const DEFAULT_MENU_BG_PACK = "none";

export function getMenuBgPack(id: string | undefined | null): MenuBgPack {
  return MENU_BG_PACKS.find((p) => p.id === id) ?? MENU_BG_PACKS[0];
}

// Deterministic scatter positions (%, px, deg). Spread across the page,
// avoiding dead-center so headings stay legible.
const SPOTS = [
  { x: 6, y: 7, s: 58, r: -14 },
  { x: 80, y: 5, s: 44, r: 16 },
  { x: 44, y: 14, s: 38, r: -8 },
  { x: 88, y: 26, s: 52, r: 22 },
  { x: 4, y: 30, s: 46, r: 10 },
  { x: 70, y: 40, s: 60, r: -18 },
  { x: 22, y: 46, s: 40, r: 14 },
  { x: 90, y: 54, s: 42, r: -6 },
  { x: 8, y: 60, s: 56, r: 18 },
  { x: 52, y: 64, s: 38, r: -12 },
  { x: 78, y: 72, s: 50, r: 8 },
  { x: 30, y: 78, s: 44, r: -20 },
  { x: 6, y: 86, s: 54, r: 12 },
  { x: 86, y: 90, s: 46, r: -10 },
  { x: 56, y: 92, s: 40, r: 16 },
  { x: 40, y: 36, s: 34, r: 24 },
];

// Faint watermark layer for one page. Cycles the pack glyphs across the spots.
export function MenuBgLayer({
  pack,
  seed = 0,
}: {
  pack: MenuBgPack;
  seed?: number;
}) {
  if (pack.glyphs.length === 0) return null;
  return (
    <div className="menu-bg-layer" aria-hidden>
      {SPOTS.map((p, i) => {
        const Glyph = pack.glyphs[(i + seed) % pack.glyphs.length];
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.s,
              height: p.s,
              transform: `rotate(${p.r}deg)`,
            }}
          >
            <Glyph />
          </svg>
        );
      })}
    </div>
  );
}
