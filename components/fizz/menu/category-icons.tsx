// Icon set used for menu categories. Keys must match MENU_CATEGORY_ICONS in
// lib/db/schema/menu.ts. Rendered in both the admin manager and the public
// menu, so no client-only deps. 24×24, currentColor, 1.6 stroke.
import type { MenuCategoryIcon } from "@/lib/db/schema";

type P = { className?: string };
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<MenuCategoryIcon, React.ReactNode> = {
  cup: (
    <>
      <path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" />
      <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 3v2M11 3v2" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 2c-.5 1 .5 2 0 3M11 2c-.5 1 .5 2 0 3" />
    </>
  ),
  tea: (
    <>
      <path d="M5 8h10v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" />
      <path d="M15 9h3a2 2 0 0 1 0 4h-3" />
      <path d="M9 2c-.4.8.4 1.6 0 2.5" />
      <path d="M4 21h12" />
    </>
  ),
  cold: (
    <>
      <path d="M7 8h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 8Z" />
      <path d="M6 8h12" />
      <path d="M9 3l1 5M15 3l-1 5" />
      <path d="M9 13v4M12 12v5M15 13v4" />
    </>
  ),
  pastry: (
    <>
      <path d="M3 13a9 4 0 0 1 18 0v3a9 4 0 0 1-18 0v-3Z" />
      <path d="M7 13.5v3M12 14v3M17 13.5v3" />
    </>
  ),
  cake: (
    <>
      <path d="M4 11a8 3 0 0 1 16 0v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z" />
      <path d="M4 15a8 3 0 0 0 16 0" />
      <path d="M12 4v3M12 4c1 0 1-1 0-1.5" />
    </>
  ),
  sandwich: (
    <>
      <path d="M3 8a9 3 0 0 1 18 0" />
      <path d="M3 8v3a9 3 0 0 0 18 0V8" />
      <path d="M4 14l3 4h10l3-4" />
    </>
  ),
  salad: (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M12 11c0-3 2-5 5-5M12 11c0-2-2-4-5-4" />
      <path d="M9 19h6" />
    </>
  ),
  breakfast: (
    <>
      <circle cx="9" cy="11" r="6" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M17 4v8M17 4c2 0 3 2 3 4s-1 4-3 4" />
    </>
  ),
  bottle: (
    <>
      <path d="M10 2h4v3l1 2v13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7l1-2V2Z" />
      <path d="M9 11h6" />
    </>
  ),
  wine: (
    <>
      <path d="M7 3h10l-1 6a4 4 0 0 1-8 0L7 3Z" />
      <path d="M12 13v6M8 21h8" />
    </>
  ),
  star: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z" />,
  leaf: (
    <>
      <path d="M4 20C3 10 10 4 20 4c0 10-6 17-16 16Z" />
      <path d="M9 15c3-3 6-4 9-5" />
    </>
  ),
  fire: (
    <>
      <path d="M12 3c1 3-1 4-2 6-1 2 0 4 2 4s3-2 2-4c2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 4-6 5-11Z" />
    </>
  ),
};

export function MenuCategoryIconGlyph({
  name,
  className,
}: P & { name: string }) {
  const glyph = ICONS[(name as MenuCategoryIcon)] ?? ICONS.cup;
  return (
    <svg {...base} className={className} aria-hidden>
      {glyph}
    </svg>
  );
}
