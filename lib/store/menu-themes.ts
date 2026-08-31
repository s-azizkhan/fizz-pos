// Preset looks for the public menu page (/m/[slug]). Pure data — imported by
// the server renderer, the zod schema, and the admin picker alike.
//
// A theme is just a set of CSS variables the page paints with, so adding one
// is a row here and nothing else. Fonts are system stacks plus the two faces
// the app already loads (Inter, Space Grotesk) — no extra webfont downloads.
// ponytail: no per-theme layout variants; palette + type carries the mood.

const INTER = "var(--font-inter), system-ui, sans-serif";
const GROTESK = "var(--font-space-grotesk), system-ui, sans-serif";
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const SLAB = "Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', ui-monospace, 'Cascadia Mono', Menlo, monospace";

export type MenuTheme = {
  key: string;
  name: string;
  blurb: string;
  /** Suggested accent — applied when the theme is picked, still overridable. */
  accent: string;
  bg: string;
  /** Raised surfaces: cart sheet, pills. */
  surface: string;
  text: string;
  muted: string;
  line: string;
  /** Body font stack. */
  font: string;
  /** Heading/price font stack. */
  display: string;
  /** Corner radius on cards, buttons, the cart sheet. */
  radius: string;
  /** Letter-spacing + case for the section eyebrow. */
  eyebrow: "wide" | "tight";
};

export const MENU_THEMES: MenuTheme[] = [
  {
    key: "midnight",
    name: "Midnight",
    blurb: "Fizz house style. Near-black ink, high-voltage lime.",
    accent: "#C6F432",
    bg: "#0E1116", surface: "#1A1F28", text: "#F4F1E9", muted: "#8A93A1", line: "#2A313C",
    font: INTER, display: GROTESK, radius: "18px", eyebrow: "wide",
  },
  {
    key: "parchment",
    name: "Parchment",
    blurb: "Warm paper and old serif. A menu you want to hold.",
    accent: "#9A5B2C",
    bg: "#F6F0E4", surface: "#EFE6D5", text: "#2C2418", muted: "#8B7C63", line: "#DDD0B8",
    font: SERIF, display: SERIF, radius: "4px", eyebrow: "wide",
  },
  {
    key: "noir",
    name: "Noir",
    blurb: "Pure black, hairline rules, quiet gold. Fine dining.",
    accent: "#C9A227",
    bg: "#000000", surface: "#0B0B0B", text: "#F2F0EC", muted: "#8C8880", line: "#242220",
    font: SERIF, display: SERIF, radius: "0px", eyebrow: "wide",
  },
  {
    key: "espresso",
    name: "Espresso",
    blurb: "Dark chocolate with caramel. Deep and roasty.",
    accent: "#E0A458",
    bg: "#1B1310", surface: "#2A1E19", text: "#F3E9DF", muted: "#A8917F", line: "#3B2B24",
    font: INTER, display: SLAB, radius: "14px", eyebrow: "wide",
  },
  {
    key: "matcha",
    name: "Matcha",
    blurb: "Soft green calm. Slow mornings, bright light.",
    accent: "#3F7D4F",
    bg: "#F3F6EF", surface: "#E7EEE1", text: "#1F2A20", muted: "#75846F", line: "#D3DFCB",
    font: INTER, display: GROTESK, radius: "20px", eyebrow: "wide",
  },
  {
    key: "terracotta",
    name: "Terracotta",
    blurb: "Clay, sand, and sun. Warm and unfussy.",
    accent: "#C25A38",
    bg: "#FBF3EC", surface: "#F4E5D8", text: "#33231B", muted: "#93796A", line: "#E6D2C2",
    font: INTER, display: SLAB, radius: "22px", eyebrow: "wide",
  },
  {
    key: "neon",
    name: "Neon",
    blurb: "Plum dark with electric magenta. Late-night bar.",
    accent: "#FF4D9D",
    bg: "#140A1E", surface: "#20112F", text: "#F6EDFB", muted: "#A08CB4", line: "#33204A",
    font: GROTESK, display: GROTESK, radius: "16px", eyebrow: "wide",
  },
  {
    key: "linen",
    name: "Linen",
    blurb: "Swiss white. Tight type, nothing shouting.",
    accent: "#111111",
    bg: "#FFFFFF", surface: "#F4F4F2", text: "#111111", muted: "#767674", line: "#E3E3E0",
    font: INTER, display: INTER, radius: "2px", eyebrow: "tight",
  },
  {
    key: "coastal",
    name: "Coastal",
    blurb: "Sea glass and pale sand. Breezy and open.",
    accent: "#2E7C9B",
    bg: "#F2F7F9", surface: "#E4EFF3", text: "#122630", muted: "#6F8894", line: "#CFE0E7",
    font: INTER, display: GROTESK, radius: "20px", eyebrow: "wide",
  },
  {
    key: "risograph",
    name: "Risograph",
    blurb: "Zine-print mono on bone. Loud, cheap, charming.",
    accent: "#FF5A1F",
    bg: "#FAF7F0", surface: "#F0EBE0", text: "#161513", muted: "#7A756B", line: "#DED7C8",
    font: MONO, display: MONO, radius: "0px", eyebrow: "tight",
  },
];

export const MENU_THEME_KEYS = MENU_THEMES.map((t) => t.key) as [string, ...string[]];

export function getMenuTheme(key: string): MenuTheme {
  return MENU_THEMES.find((t) => t.key === key) ?? MENU_THEMES[0];
}

// CSS custom properties the page and the cart both read. Accent is passed
// separately because the store's own accent overrides the theme's.
export function themeVars(theme: MenuTheme, accent: string): React.CSSProperties {
  return {
    "--m-bg": theme.bg,
    "--m-surface": theme.surface,
    "--m-text": theme.text,
    "--m-muted": theme.muted,
    "--m-line": theme.line,
    "--m-accent": accent,
    "--m-radius": theme.radius,
    fontFamily: theme.font,
  } as React.CSSProperties;
}
