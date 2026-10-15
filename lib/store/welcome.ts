import { z } from "zod";

// The public menu's welcome screen (/m/[slug]): cover, name, table badge, a
// stack of tappable cards, social icons. Everything the café can change lives
// in one `store.menu_welcome` jsonb so the admin form saves it in one field.
// Client-safe: no server imports.

export const CARD_KINDS = ["menu", "review", "wifi", "call", "whatsapp", "link"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

const url = z.string().trim().max(500).regex(/^https?:\/\/\S+$/, "Paste a full link (https://…)");

export const welcomeCard = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(CARD_KINDS),
  title: z.string().trim().min(1, "Give the card a title").max(40),
  subtitle: z.string().trim().max(60).default(""),
  on: z.boolean().default(true),
  // kind-specific. `review` and `link` open href; `wifi` reveals ssid/password;
  // `menu`, `call`, `whatsapp` need nothing — they read the store.
  href: z.union([url, z.literal("")]).optional(),
  ssid: z.string().trim().max(60).optional(),
  password: z.string().trim().max(80).optional(),
  // Optional Lottie (.lottie / .json URL) in place of the line icon.
  lottie: z.union([url, z.literal("")]).optional(),
});
export type WelcomeCard = z.infer<typeof welcomeCard>;

export const welcomeConfig = z.object({
  on: z.boolean().default(false),
  coverUrl: z.union([url, z.literal("")]).optional(),
  // Optional Lottie played over the hero (on top of the cover or the cup art).
  heroLottie: z.union([url, z.literal("")]).optional(),
  cards: z.array(welcomeCard).max(12, "That's a lot of cards"),
  // Any links; the icon comes from the host (instagram.com → Instagram…).
  socials: z.array(url).max(8),
});
export type WelcomeConfig = z.infer<typeof welcomeConfig>;

// What a card of this kind looks like when the admin adds it.
export const CARD_PRESETS: Record<CardKind, { label: string; title: string; subtitle: string }> = {
  menu: { label: "Menu", title: "View Menu", subtitle: "Order to your table" },
  review: { label: "Review link", title: "Leave a Review", subtitle: "Tell us how we did" },
  wifi: { label: "Wi-Fi", title: "Connect to Wi-Fi", subtitle: "Tap for the password" },
  call: { label: "Call", title: "Call Us", subtitle: "Ask about today's specials" },
  whatsapp: { label: "WhatsApp", title: "Chat on WhatsApp", subtitle: "We reply fast" },
  link: { label: "Custom link", title: "Play Games", subtitle: "While you wait" },
};

export function newCard(kind: CardKind, id = crypto.randomUUID().slice(0, 8)): WelcomeCard {
  const p = CARD_PRESETS[kind];
  return { id, kind, title: p.title, subtitle: p.subtitle, on: true };
}

export const DEFAULT_WELCOME: WelcomeConfig = {
  on: false,
  cards: [newCard("menu", "m1"), newCard("review", "r1"), newCard("wifi", "w1")],
  socials: [],
};
