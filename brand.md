# Fizz — Brand & Design System

Single source of truth for every design choice. Apply this on all UI work. When unsure, match this doc, not generic defaults.

## Identity

- **Name:** Fizz — the Café Operating System.
- **Product:** POS + inventory + margins for independent cafés/restaurants, in one live loop.
- **Personality:** Fast. Sharp. Effervescent. Honest.
- **Look:** Dark-first. Near-black ink base + one high-voltage electric-lime accent. Effervescent (rising bubbles). Tension via color — never warm/safe.

## Color tokens

Defined in `app/globals.css` `@theme`. Use the Tailwind classes — never raw hex in components.

| Token | Hex | Class | Use |
|---|---|---|---|
| Ink | `#0E1116` | `bg-ink` / `text-ink` | Base background; text on lime |
| Ink Soft | `#1A1F28` | `bg-ink-soft` | Cards, inputs, raised surfaces |
| Ink Line | `#2A313C` | `border-ink-line` | Borders, dividers |
| Cream | `#F4F1E9` | `text-cream` / `bg-cream` | Primary text on ink |
| **Fizz Lime** | `#C6F432` | `bg-fizz` / `text-fizz` | **Primary accent** — CTAs, highlights, focus |
| Soda Cyan | `#38E1D6` | `text-bubble` | Secondary accent, sparingly (the ● dot, micro-detail) |
| Steam | `#8A93A1` | `text-steam` | Muted text, captions, placeholders |
| Error | `#E2655A` | `text-[#E2655A]` | Errors only |

Rules:
- One accent dominates: **lime**. Cyan is a garnish, not a co-star.
- Lime is loud — use on small high-intent surfaces (buttons, focus rings, key words). Never large lime fills.
- Text on lime is always `text-ink` (dark), never cream.
- Eyebrows/section labels: `text-fizz`, uppercase, `tracking-[0.18em]`, `text-xs font-semibold`.

## Typography

- **Display / headings / wordmark / numerals:** Space Grotesk → `font-display` (`--font-space-grotesk`). Weights 400–700.
- **Body / UI:** Inter → `font-sans` (default, `--font-inter`). Weights 400–600.
- Headings: `font-display font-bold tracking-tight`. Hero/section heads use fluid sizing: `text-[clamp(26px,4vw,40px)]`; hero H1 `text-[clamp(28px,5vw,56px)]`.
- Body copy: `text-lg text-steam` for intros; `text-cream` for primary.
- Measure: cap line length — `max-w-[60ch]` for paragraphs, `max-w-[18ch]–[20ch]` for headlines.

### Wordmark
Always: `Fi` cream + `zz` lime + `●` cyan superscript dot.
```tsx
Fi<span className="text-fizz">zz</span><span className="align-super text-xs text-bubble">●</span>
```

## Shape & layout

- Radius: `rounded-fizz` (18px) on cards, inputs, buttons, pills. One radius everywhere.
- Page container: `mx-auto max-w-6xl px-6`. Section vertical rhythm: `py-24`.
- Section separation: `border-b border-ink-line` (hairline), not shadows.
- Cards: `rounded-fizz border border-ink-line bg-ink-soft p-7`.
- Pills: `rounded-full border border-ink-line bg-ink-soft px-4 py-2 text-sm`.

## Components

**Primary button / CTA**
```tsx
className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
```
**Inputs**
```tsx
className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
```
**Eyebrow label**
```tsx
className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz"
```

## Motion

- Effervescent bubbles = signature hero motif (`fizz-bubble` + `@keyframes rise` in globals.css). Deterministic positions (no random) so SSR/client match.
- Interaction: subtle `hover:scale-105`, color transitions. No heavy/bouncy animation. Fast and light.

## Voice & tone

Four attributes — what it IS / is NOT:
- **Fast** — short sentences, verbs first, no jargon. Not clipped or cold.
- **Sharp** — specific numbers, real café language. Not vague SaaS-speak.
- **Effervescent** — light, a little playful, alive. Not goofy or unserious about money.
- **Honest** — plain hard numbers. Not flattering or sugar-coated.

Copy patterns: name the outcome not the process. Enemy = spreadsheets/guesswork, not Toast/Square. Café idiom welcome ("we'll pour you a spot", "something fizzled"). Em-dash for punch.

## Do / Don't

- ✅ Dark ink canvas, lime for intent, cream text, hairline borders.
- ✅ Space Grotesk headings, Inter body, capped line length, `rounded-fizz`.
- ❌ Light/white backgrounds, warm orange/red, multiple competing accents.
- ❌ Drop shadows for separation, generic SaaS gradients, large lime fills.
- ❌ Raw hex in components (use tokens), `text-cream` on lime.

## Stack conventions (for consistency)

- Next.js 16 app router. Server Components default; `'use client'` only for interactivity (forms, nav toggle, state).
- Brand UI lives in `components/fizz/`.
- Forms → Server Actions (`'use server'`) + `useActionState`; validate with **zod**.
- Client UI state → **zustand** (`lib/store/ui.ts`).
- DB → **Drizzle** + postgres.js (`lib/db/`), `DB_URL` env, server-only.
