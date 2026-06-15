// Printable-menu COLOR SCHEMES. Pure palette + type pairing — no layout. How
// the page is arranged (cover, item rows, case, density) lives separately in
// `menu-layouts.ts`, so any scheme combines with any layout.

export type MenuColorScheme = {
  id: string;
  name: string;
  // One-line pitch shown on the picker card.
  blurb: string;
  // Theme tokens (raw hex/CSS — this renders standalone, not in the app shell).
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  // Text color that sits on top of an accent fill.
  accentFg: string;
  divider: string;
  fontHead: string;
  fontBody: string;
};

const SPACE = "var(--font-space-grotesk), system-ui, sans-serif";
const INTER = "var(--font-inter), system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', ui-monospace, 'Courier New', monospace";

export const MENU_COLOR_SCHEMES: MenuColorScheme[] = [
  {
    id: "fizz",
    name: "Fizz Dark",
    blurb: "Signature near-black with high-voltage lime. On brand.",
    bg: "#0E1116",
    fg: "#F4F1E9",
    muted: "#8A93A1",
    accent: "#C6F432",
    accentFg: "#0E1116",
    divider: "#2A313C",
    fontHead: SPACE,
    fontBody: INTER,
  },
  {
    id: "cream",
    name: "Classic Cream",
    blurb: "Warm paper, serif type. Timeless café.",
    bg: "#F4F1E9",
    fg: "#2A241B",
    muted: "#7A6E5A",
    accent: "#9A6B33",
    accentFg: "#F4F1E9",
    divider: "#D8CFBE",
    fontHead: SERIF,
    fontBody: SERIF,
  },
  {
    id: "mono",
    name: "Minimal Mono",
    blurb: "White, black, monospace. Stripped to the essentials.",
    bg: "#FFFFFF",
    fg: "#141414",
    muted: "#8C8C8C",
    accent: "#141414",
    accentFg: "#FFFFFF",
    divider: "#E6E6E6",
    fontHead: MONO,
    fontBody: MONO,
  },
  {
    id: "punch",
    name: "Paper & Red",
    blurb: "Off-white stock with a jolt of editorial red.",
    bg: "#FCFBF7",
    fg: "#14110E",
    muted: "#6B6B6B",
    accent: "#E2402F",
    accentFg: "#FCFBF7",
    divider: "#14110E",
    fontHead: SPACE,
    fontBody: INTER,
  },
  {
    id: "chalk",
    name: "Chalkboard",
    blurb: "Dark slate with chalk-gold accents. The café board look.",
    bg: "#1C2422",
    fg: "#ECEEE6",
    muted: "#9AA39C",
    accent: "#E8C36B",
    accentFg: "#1C2422",
    divider: "rgba(236,238,230,0.18)",
    fontHead: SPACE,
    fontBody: INTER,
  },
  /* ----- Retro ----- */
  {
    id: "diner",
    name: "Diner '57",
    blurb: "Cream + teal with cherry-red accents. Chrome-era diner.",
    bg: "#FBF3E4",
    fg: "#1E3A3A",
    muted: "#7E8C84",
    accent: "#E63A4E",
    accentFg: "#FBF3E4",
    divider: "#D8C9A8",
    fontHead: SERIF,
    fontBody: SERIF,
  },
  {
    id: "groovy",
    name: "Groovy '70s",
    blurb: "Mustard paper, burnt-orange accents, warm browns.",
    bg: "#F2E2C4",
    fg: "#4A2E12",
    muted: "#9A7B52",
    accent: "#E07A1F",
    accentFg: "#2B1A10",
    divider: "#D9C19A",
    fontHead: SERIF,
    fontBody: SERIF,
  },
  {
    id: "vapor",
    name: "Vaporwave",
    blurb: "Deep purple night with hot-pink neon. 80s synth.",
    bg: "#1A0B2E",
    fg: "#F5E6FF",
    muted: "#9A7FB5",
    accent: "#FF4FD8",
    accentFg: "#1A0B2E",
    divider: "#3A1F5C",
    fontHead: MONO,
    fontBody: MONO,
  },
  {
    id: "sepia",
    name: "Sepia Press",
    blurb: "Aged paper, rust ink, serif type. Old letterpress.",
    bg: "#E9DCC3",
    fg: "#3B2A1A",
    muted: "#8A745A",
    accent: "#8C3A24",
    accentFg: "#E9DCC3",
    divider: "#C9B58F",
    fontHead: SERIF,
    fontBody: SERIF,
  },
];

export const DEFAULT_MENU_COLOR_SCHEME = MENU_COLOR_SCHEMES[0].id;

export function getMenuColorScheme(
  id: string | undefined | null,
): MenuColorScheme {
  return (
    MENU_COLOR_SCHEMES.find((s) => s.id === id) ?? MENU_COLOR_SCHEMES[0]
  );
}
