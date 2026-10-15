"use client";

import { useRef, useState } from "react";
import { toast } from "@/lib/store/toast";
import { TrashIcon } from "@/components/fizz/dashboard/icons";

// Image picker: upload from the device (resized in the browser first, so a
// 12 MP phone photo lands as a few hundred KB) or paste an https URL. The
// value is a URL either way — our own /api/img/<id> for uploads.
export default function ImageField({
  kind,
  value,
  onChange,
  name,
  maxEdge,
  aspect = "landscape",
  hint,
}: {
  kind: "logo" | "cover";
  value: string;
  onChange: (url: string) => void;
  /** Form field name for the hidden input (when the parent submits a form). */
  name?: string;
  /** Longest side after resize. */
  maxEdge: number;
  aspect?: "landscape" | "square";
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const blob = await shrink(file, maxEdge);
      const fd = new FormData();
      fd.append("file", blob, "image.jpg");
      fd.append("kind", kind);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? "Upload failed");
      onChange(j.url);
      toast.success("Image uploaded — save to keep it");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const preview = value.startsWith("/api/img/") || /^https?:\/\//.test(value) ? value : null;
  const box = aspect === "square" ? "h-24 w-24" : "h-24 w-40";

  return (
    <div className="flex flex-col gap-2">
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex items-center gap-3">
        <div
          className={`${box} flex shrink-0 items-center justify-center overflow-hidden rounded-fizz border border-dashed border-ink-line bg-ink text-xs text-steam`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            "No image"
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="rounded-fizz bg-fizz px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
            >
              {busy ? "Uploading…" : preview ? "Replace" : "Upload"}
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 rounded-fizz border border-ink-line px-3 py-2 text-sm font-semibold text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          <input
            value={value.startsWith("/api/img/") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={value.startsWith("/api/img/") ? "Uploaded image" : "or paste an https:// image link"}
            className="w-full rounded-fizz border border-ink-line bg-ink px-3 py-2 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
        </div>
      </div>
      {hint && <span className="text-xs text-steam">{hint}</span>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />
    </div>
  );
}

// Resize on a canvas; JPEG at 0.85 unless the source is a PNG with alpha
// (logos) — those stay PNG so the transparency survives.
async function shrink(file: File, maxEdge: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const png = file.type === "image/png";
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("Could not read that image"))), png ? "image/png" : "image/jpeg", 0.85),
  );
}
