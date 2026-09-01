/**
 * Generates every PWA raster asset (icons + iOS splash screens) from one
 * vector source, so the brand only has to be defined once.
 *
 * Run: npx tsx scripts/generate-pwa-assets.mts
 *
 * Uses sharp, which Next already depends on for image optimisation — no new
 * dependency. Glyphs are drawn with plain <rect>/<circle> rather than <text>
 * because sharp's SVG rasteriser does not resolve system fonts reliably.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const INK = "#0E1116";
const LIME = "#C6F432";
const CYAN = "#38E1D6";

/**
 * The "F" mark plus its cyan fizz dot, drawn in a 100x100 user-space box.
 *
 * The rectangles below are the real Pixelify Sans (700) "F" outline, traced off
 * a canvas rasterisation of the glyph — sharp's SVG rasteriser can't resolve
 * fonts, so the letterform is inlined rather than set as <text>. Coordinates
 * are in the glyph's own 192x259 box; U is its pixel-grid unit.
 */
const GLYPH_W = 192;
const GLYPH_H = 259;
const U = 50;
const F_RECTS: [number, number, number, number][] = [
  [0, 0, 156, 35], // top bar
  [0, 35, 192, 19], // ...and its overhanging step
  [141, 54, 51, 34], // the hook dropping off the top-right
  [0, 54, 50, 205], // stem
  [0, 103, 121, 53], // middle bar
];

function mark(scale: number, cx: number, cy: number) {
  // `scale` maps the old 100-unit box; keep the mark the same visual height.
  const s = (scale * 78) / GLYPH_H;
  const w = GLYPH_W * s + U * s * 1.6; // glyph + gap + dot
  const left = cx - w / 2;
  const top = cy - (GLYPH_H * s) / 2;
  const n = (v: number) => v.toFixed(2);
  const cells = F_RECTS.map(
    ([x, y, rw, rh]) =>
      `<rect x="${n(left + x * s)}" y="${n(top + y * s)}" width="${n((rw + 1) * s)}" height="${n((rh + 1) * s)}" fill="${LIME}"/>`,
  ).join("");
  // (+1 glyph unit on each rect so abutting edges don't show antialias seams.)
  // The ● of the wordmark, squared off to the same pixel grid.
  return `${cells}<rect x="${n(left + (GLYPH_W + U * 0.6) * s)}" y="${n(top)}" width="${n(U * s)}" height="${n(U * s)}" fill="${CYAN}"/>`;
}

function iconSvg(size: number, { maskable = false } = {}) {
  // Maskable icons must survive a circular crop: keep the mark inside the
  // safe zone (80% of the canvas) and let the ink field bleed to the edges.
  const scale = (size / 100) * (maskable ? 0.62 : 0.84);
  const radius = maskable ? 0 : size * 0.22;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${INK}"/>
    ${mark(scale, size / 2, size / 2)}
  </svg>`);
}

function splashSvg(w: number, h: number) {
  const scale = (Math.min(w, h) / 100) * 0.3;
  const cy = h / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${INK}"/>
    <circle cx="${w / 2}" cy="${cy}" r="${Math.min(w, h) * 0.34}" fill="${LIME}" opacity="0.05"/>
    ${mark(scale, w / 2, cy)}
  </svg>`);
}

// device-width x device-height in CSS px, and the device pixel ratio. iOS only
// uses a startup image whose media query matches the device exactly.
const IOS_DEVICES: [number, number, number][] = [
  [320, 568, 2],
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [390, 844, 3],
  [393, 852, 3],
  [402, 874, 3],
  [414, 896, 2],
  [414, 896, 3],
  [428, 926, 3],
  [430, 932, 3],
  [440, 956, 3],
  [768, 1024, 2],
  [834, 1194, 2],
  [1024, 1366, 2],
];

const png = (svg: Buffer, out: string) => sharp(svg).png({ compressionLevel: 9 }).toFile(out);

await mkdir("public/splash", { recursive: true });

await Promise.all([
  png(iconSvg(192), "public/icon-192.png"),
  png(iconSvg(512), "public/icon-512.png"),
  png(iconSvg(512, { maskable: true }), "public/icon-maskable-512.png"),
  png(iconSvg(180), "public/apple-icon.png"),
  png(iconSvg(32), "public/favicon-32.png"),
  ...IOS_DEVICES.map(([w, h, dpr]) =>
    png(splashSvg(w * dpr, h * dpr), `public/splash/${w}x${h}@${dpr}x.png`),
  ),
]);

// Emit the <link media=""> list so metadata stays in sync with what we wrote.
console.log(
  JSON.stringify(
    IOS_DEVICES.map(([w, h, dpr]) => ({
      url: `/splash/${w}x${h}@${dpr}x.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr})`,
    })),
    null,
    2,
  ),
);
