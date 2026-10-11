// Minimal ESC/POS byte builder for 58/80mm thermal printers. Covers what a
// receipt or KOT needs: text, alignment, bold, double size, feed, cut.
// ponytail: ASCII only. Thermal codepages can't print ₹ or most non-Latin
// glyphs, so text goes through `ascii()`. ₹ is the exception: it's downloaded
// as a user-defined glyph over "~" (ESC &). Images are 1-bit pixel art only.

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ₹ rides on the "~" slot, so a real "~" prints as "-".
export const RUPEE = "~";

// Strip accents ("café" → "cafe"), then swap anything still outside
// printable ASCII for "?" so the printer never renders codepage garbage.
export function ascii(s: string): string {
  return s
    .replace(/~/g, "-")
    .replace(/₹/g, RUPEE)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

// ₹ as a 12x24 Font A glyph ("#" = black). ponytail: hand-drawn; printers
// without ESC & support print a plain "~" instead.
const RUPEE_GLYPH = [
  "............",
  "............",
  "............",
  ".##########.",
  ".##########.",
  ".......##...",
  "........##..",
  "........##..",
  ".##########.",
  ".##########.",
  "........##..",
  ".......##...",
  ".######.....",
  ".#####......",
  "...##.......",
  "....##......",
  ".....##.....",
  "......##....",
  ".......##...",
  "........##..",
  ".........##.",
  "............",
  "............",
  "............",
];

// ESC & 3 c c 12 <36 bytes>: column-major, 3 bytes per column, MSB on top.
function defineRupee(): number[] {
  const out = [ESC, 0x26, 3, RUPEE.charCodeAt(0), RUPEE.charCodeAt(0), 12];
  for (let x = 0; x < 12; x++) {
    for (let b = 0; b < 3; b++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (RUPEE_GLYPH[b * 8 + bit][x] === "#") byte |= 0x80 >> bit;
      }
      out.push(byte);
    }
  }
  return out;
}

export type Align = "left" | "center" | "right";

// One printed line as the printer will lay it out — feeds the on-screen
// preview so it matches the bytes. ponytail: images aren't recorded.
export type PrintOp = {
  text: string;
  align: Align;
  bold: boolean;
  w: 1 | 2;
  h: 1 | 2;
  lh: number; // line height in dots
  gap: number; // letter spacing in dots
};

export function escpos() {
  // ESC @ = reset, then download ₹ and switch the user-defined set on (ESC %).
  const out: number[] = [ESC, 0x40, ...defineRupee(), ESC, 0x25, 1];
  const st: Omit<PrintOp, "text"> = { align: "left", bold: false, w: 1, h: 1, lh: 30, gap: 0 };
  const ops: PrintOp[] = [];
  const api = {
    ops,
    text(s: string) {
      for (const ch of ascii(s)) out.push(ch.charCodeAt(0));
      return api;
    },
    line(s = "") {
      ops.push({ ...st, text: s });
      api.text(s);
      out.push(LF);
      return api;
    },
    align(a: Align) {
      st.align = a;
      out.push(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
      return api;
    },
    bold(on: boolean) {
      st.bold = on;
      out.push(ESC, 0x45, on ? 1 : 0);
      return api;
    },
    // 1 = normal, 2 = double. Width and height scale independently.
    size(w: 1 | 2, h: 1 | 2 = w) {
      Object.assign(st, { w, h });
      out.push(GS, 0x21, ((w - 1) << 4) | (h - 1));
      return api;
    },
    // Raster bitmap (GS v 0) from rows of "#"/"." where "#" prints black.
    // Each cell becomes a scale x scale block of dots.
    image(rows: string[], scale = 1) {
      const w = rows[0].length * scale;
      const h = rows.length * scale;
      const bw = Math.ceil(w / 8);
      out.push(GS, 0x76, 0x30, 0, bw & 0xff, bw >> 8, h & 0xff, h >> 8);
      for (let y = 0; y < h; y++) {
        const r = rows[Math.floor(y / scale)];
        for (let b = 0; b < bw; b++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = b * 8 + bit;
            if (x < w && r[Math.floor(x / scale)] === "#") byte |= 0x80 >> bit;
          }
          out.push(byte);
        }
      }
      return api;
    },
    // Line height in dots (ESC 3). Printer default is ~30.
    spacing(dots: number) {
      st.lh = dots;
      out.push(ESC, 0x33, dots);
      return api;
    },
    // Double-strike (ESC G): each dot line printed twice for darker, crisper
    // strokes. Independent of bold, so bold still stands out on top of it.
    dark(on: boolean) {
      out.push(ESC, 0x47, on ? 1 : 0);
      return api;
    },
    // Extra dots to the right of each character (ESC SP). Doubles with
    // double-width text.
    letterSpacing(dots: number) {
      st.gap = dots;
      out.push(ESC, 0x20, dots);
      return api;
    },
    feed(lines = 1) {
      for (let i = 0; i < lines; i++) ops.push({ ...st, text: "" });
      out.push(ESC, 0x64, lines);
      return api;
    },
    // Feed to the cutter (no extra margin), then partial cut. Printers without a cutter
    // ignore it.
    cut() {
      out.push(GS, 0x56, 0x42, 0x00);
      return api;
    },
    bytes(): Uint8Array<ArrayBuffer> {
      return new Uint8Array(out);
    },
  };
  return api;
}
