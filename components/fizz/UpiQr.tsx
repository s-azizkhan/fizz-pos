"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders a UPI deep link as a scannable QR. Ink modules on a cream tile —
// scanners need dark-on-light and a quiet zone, so this is the one place a
// light fill is correct. Encoding is async, so nothing renders until ready.
export default function UpiQr({
  value,
  size = 200,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x for crisp rendering on retina / phone cameras
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0E1116", light: "#F4F1E9" },
    })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [value, size]);

  return (
    <div
      className={`grid place-items-center overflow-hidden rounded-fizz bg-cream ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element -- data: URL; next/image adds nothing */
        <img src={src} alt="UPI payment QR code" width={size} height={size} />
      ) : (
        <span className="text-xs text-ink/50">…</span>
      )}
    </div>
  );
}
