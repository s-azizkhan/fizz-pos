// Printable-menu LAYOUTS (appearance style). Controls page arrangement only —
// cover treatment, how item rows read, heading case, and vertical density.
// Pairs with any color scheme (`print-styles.ts`).

export type MenuLayoutCover =
  | "band"
  | "centered"
  | "editorial"
  | "split"
  | "poster"
  | "ticket";
export type MenuLayoutItemRow =
  | "split"
  | "leaders"
  | "stacked"
  | "card"
  | "pill";
export type MenuLayoutDensity = "cozy" | "normal" | "airy";

export type MenuLayout = {
  id: string;
  name: string;
  blurb: string;
  cover: MenuLayoutCover;
  itemRow: MenuLayoutItemRow;
  uppercaseHeads: boolean;
  density: MenuLayoutDensity;
  // Body laid out in N newspaper columns. Default 1.
  columns?: 1 | 2;
  // Inset hairline frame around every page.
  framed?: boolean;
  // Dashed dividers + dashed frame (receipt feel).
  dashed?: boolean;
  // Prepend a running number to each item.
  numbered?: boolean;
  // Everything on ONE page: no cover, no closing page — brand band on top,
  // contact band at the bottom.
  single?: boolean;
  // A3 landscape sheets folded down the middle into an A4 booklet: one sheet
  // holds two panels (back + front cover), the other the menu spread.
  fold?: boolean;
};

export const MENU_LAYOUTS: MenuLayout[] = [
  {
    id: "modern",
    name: "Modern",
    blurb: "Accent banded cover, prices hard-right, uppercase heads.",
    cover: "band",
    itemRow: "split",
    uppercaseHeads: true,
    density: "normal",
  },
  {
    id: "classic",
    name: "Classic",
    blurb: "Centered cover, dotted price leaders. The diner standard.",
    cover: "centered",
    itemRow: "leaders",
    uppercaseHeads: false,
    density: "normal",
  },
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Oversized cover, stacked prices. Magazine energy.",
    cover: "editorial",
    itemRow: "stacked",
    uppercaseHeads: true,
    density: "normal",
  },
  {
    id: "compact",
    name: "Compact",
    blurb: "Tight rows, split prices. Fit more per page.",
    cover: "centered",
    itemRow: "split",
    uppercaseHeads: false,
    density: "cozy",
  },
  {
    id: "elegant",
    name: "Elegant",
    blurb: "Roomy spacing, dotted leaders. Fine-dining calm.",
    cover: "centered",
    itemRow: "leaders",
    uppercaseHeads: false,
    density: "airy",
  },
  {
    id: "bistro",
    name: "Bistro Columns",
    blurb: "Two-column newspaper body inside a hairline frame.",
    cover: "centered",
    itemRow: "leaders",
    uppercaseHeads: false,
    density: "cozy",
    columns: 2,
    framed: true,
  },
  {
    id: "cards",
    name: "Café Cards",
    blurb: "Every item in its own rounded card, two across.",
    cover: "band",
    itemRow: "card",
    uppercaseHeads: true,
    density: "normal",
    columns: 2,
  },
  {
    id: "poster",
    name: "Grand Poster",
    blurb: "Framed poster cover, one bold centered list.",
    cover: "poster",
    itemRow: "split",
    uppercaseHeads: true,
    density: "airy",
    framed: true,
  },
  {
    id: "receipt",
    name: "Receipt",
    blurb: "Dashed ticket cover, numbered rows, dashed rules.",
    cover: "ticket",
    itemRow: "split",
    uppercaseHeads: true,
    density: "cozy",
    dashed: true,
    numbered: true,
  },
  {
    id: "onepage",
    name: "One-Pager",
    blurb: "Whole menu on a single page: brand band, two columns, contact strip.",
    cover: "band",
    itemRow: "split",
    uppercaseHeads: true,
    density: "cozy",
    columns: 2,
    single: true,
  },
  {
    id: "onepage-sheet",
    name: "One-Page Sheet",
    blurb: "Single page, dotted price leaders inside a hairline frame.",
    cover: "band",
    itemRow: "leaders",
    uppercaseHeads: false,
    density: "cozy",
    columns: 2,
    framed: true,
    single: true,
  },
  {
    id: "onepage-cards",
    name: "One-Page Cards",
    blurb: "Single page, every item a bordered tile, two across.",
    cover: "band",
    itemRow: "card",
    uppercaseHeads: true,
    density: "cozy",
    columns: 2,
    single: true,
  },
  {
    id: "onepage-poster",
    name: "One-Page Poster",
    blurb: "Single page, one bold centered list. Wall-friendly.",
    cover: "band",
    itemRow: "split",
    uppercaseHeads: true,
    density: "cozy",
    single: true,
  },
  {
    id: "onepage-ticket",
    name: "One-Page Ticket",
    blurb: "Single page receipt: dashed rules, numbered rows.",
    cover: "band",
    itemRow: "split",
    uppercaseHeads: true,
    density: "cozy",
    columns: 2,
    dashed: true,
    numbered: true,
    single: true,
  },
  {
    id: "a3-fold",
    name: "A3 Book Fold",
    blurb: "Two A3 landscape sheets, folded down the middle into an A4 booklet.",
    cover: "centered",
    itemRow: "leaders",
    uppercaseHeads: false,
    density: "cozy",
    columns: 2,
    fold: true,
  },
  {
    id: "boutique",
    name: "Boutique",
    blurb: "Split cover with an accent bar, prices in pills.",
    cover: "split",
    itemRow: "pill",
    uppercaseHeads: false,
    density: "normal",
  },
];

export const DEFAULT_MENU_LAYOUT = MENU_LAYOUTS[0].id;

export function getMenuLayout(id: string | undefined | null): MenuLayout {
  return MENU_LAYOUTS.find((l) => l.id === id) ?? MENU_LAYOUTS[0];
}
