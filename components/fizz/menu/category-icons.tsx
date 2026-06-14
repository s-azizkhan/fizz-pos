// Category icons are free-form emoji stored as text. This renders the chosen
// emoji; if the stored value is empty or not a real emoji/symbol, it falls
// back to a default food icon. No client deps — used in admin + public menu.

const DEFAULT_ICON = "🍽️";

// True when the string looks like an emoji or pictographic symbol (not plain
// letters/digits that may be leftover from the old keyed icons like "cup").
function isEmojiLike(s: string): boolean {
  return /\p{Extended_Pictographic}/u.test(s);
}

export function resolveCategoryIcon(name: string | null | undefined): string {
  const v = (name ?? "").trim();
  return v && isEmojiLike(v) ? v : DEFAULT_ICON;
}

export function MenuCategoryIconGlyph({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={className} aria-hidden style={{ lineHeight: 1 }}>
      {resolveCategoryIcon(name)}
    </span>
  );
}
