// Minimal ESC/POS byte builder for 58/80mm thermal printers. Covers what a
// receipt or KOT needs: text, alignment, bold, double size, feed, cut.
// ponytail: ASCII only. Thermal codepages can't print ₹ or most non-Latin
// glyphs, so text goes through `ascii()`. Raster images (logos) are out.

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Strip accents ("café" → "cafe"), then swap anything still outside
// printable ASCII for "?" so the printer never renders codepage garbage.
export function ascii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

export type Align = "left" | "center" | "right";

export function escpos() {
  const out: number[] = [ESC, 0x40]; // ESC @ = reset
  const api = {
    text(s: string) {
      for (const ch of ascii(s)) out.push(ch.charCodeAt(0));
      return api;
    },
    line(s = "") {
      api.text(s);
      out.push(LF);
      return api;
    },
    align(a: Align) {
      out.push(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
      return api;
    },
    bold(on: boolean) {
      out.push(ESC, 0x45, on ? 1 : 0);
      return api;
    },
    // 1 = normal, 2 = double. Width and height scale independently.
    size(w: 1 | 2, h: 1 | 2 = w) {
      out.push(GS, 0x21, ((w - 1) << 4) | (h - 1));
      return api;
    },
    feed(lines = 1) {
      out.push(ESC, 0x64, lines);
      return api;
    },
    // Feed past the tear bar, then partial cut. Printers without a cutter
    // ignore it.
    cut() {
      out.push(GS, 0x56, 0x42, 0x03);
      return api;
    },
    bytes(): Uint8Array<ArrayBuffer> {
      return new Uint8Array(out);
    },
  };
  return api;
}
