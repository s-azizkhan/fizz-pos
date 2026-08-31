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

/** The "F" mark plus its cyan fizz dot, drawn in a 100x100 user-space box. */
function mark(scale: number, cx: number, cy: number) {
  const u = (n: number) => (n * scale).toFixed(2);
  const x = (n: number) => (cx + (n - 50) * scale).toFixed(2);
  const y = (n: number) => (cy + (n - 50) * scale).toFixed(2);
  return `
    <rect x="${x(28)}" y="${y(22)}" width="${u(13)}" height="${u(58)}" rx="${u(4)}" fill="${LIME}"/>
    <rect x="${x(28)}" y="${y(22)}" width="${u(44)}" height="${u(13)}" rx="${u(4)}" fill="${LIME}"/>
    <rect x="${x(28)}" y="${y(44)}" width="${u(33)}" height="${u(12)}" rx="${u(4)}" fill="${LIME}"/>
    <circle cx="${x(78)}" cy="${y(28)}" r="${u(6)}" fill="${CYAN}"/>`;
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
