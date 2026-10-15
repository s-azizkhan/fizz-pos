"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { DotLottie } from "@lottiefiles/dotlottie-react";

// Lottie player, loaded only on the client and only on pages that use one.
// The wasm renderer comes from the LottieFiles CDN on first use.
const Player = dynamic(() => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact), {
  ssr: false,
  loading: () => null,
});

// Plays a .lottie / .json animation; shows `fallback` until the player mounts
// (and if the file never loads, the canvas just stays empty behind it).
export default function Lottie({
  src,
  className,
  fallback,
  loop = true,
}: {
  src: string;
  className?: string;
  fallback?: ReactNode;
  loop?: boolean;
}) {
  const [ready, setReady] = useState(false);
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      {fallback && !ready && <span className="absolute inset-0 flex items-center justify-center">{fallback}</span>}
      <Player
        src={src}
        autoplay
        loop={loop}
        className="relative h-full w-full"
        dotLottieRefCallback={(d: DotLottie | null) => d?.addEventListener("load", () => setReady(true))}
      />
    </span>
  );
}
