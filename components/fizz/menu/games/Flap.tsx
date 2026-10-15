"use client";

import { useEffect, useRef, useState } from "react";
import { best, boardStyle, Overlay, saveBest, themeInk } from "./shared";

// Flappy-style: tap to hop a bean between columns of steam. One tap = one hop.
export default function Flap({ accent }: { accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "play" | "over">("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (state !== "play") return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.scale(dpr, dpr);
    const ink = themeInk(c);

    const GAP = 150;
    const PIPE_W = 52;
    let y = H / 2;
    let vy = 0;
    let pts = 0;
    let pipes: { x: number; top: number; passed: boolean }[] = [];
    let last = performance.now();
    let raf = 0;
    let alive = true;
    const hop = () => {
      vy = -300;
    };
    c.addEventListener("pointerdown", hop);
    const key = (e: KeyboardEvent) => e.key === " " && hop();
    window.addEventListener("keydown", key);

    const frame = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      vy += 900 * dt;
      y += vy * dt;
      const speed = 150 + pts * 4;
      if (!pipes.length || pipes[pipes.length - 1].x < W - 190) {
        pipes.push({ x: W + 10, top: 50 + Math.random() * (H - GAP - 100), passed: false });
      }
      for (const p of pipes) p.x -= speed * dt;
      pipes = pipes.filter((p) => p.x + PIPE_W > 0);

      const bx = W * 0.3;
      const r = 13;
      for (const p of pipes) {
        const inX = bx + r > p.x && bx - r < p.x + PIPE_W;
        if (inX && (y - r < p.top || y + r > p.top + GAP)) alive = false;
        if (!p.passed && p.x + PIPE_W < bx) {
          p.passed = true;
          pts++;
          setScore(pts);
        }
      }
      if (y + r > H || y - r < 0) alive = false;

      ctx.clearRect(0, 0, W, H);
      // steam columns
      for (const p of pipes) {
        const g = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        g.addColorStop(0, `${accent}55`);
        g.addColorStop(0.5, `${accent}cc`);
        g.addColorStop(1, `${accent}55`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(p.x, -10, PIPE_W, p.top + 10, 12);
        ctx.roundRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP + 10, 12);
        ctx.fill();
      }
      // bean
      ctx.save();
      ctx.translate(bx, y);
      ctx.rotate(Math.max(-0.5, Math.min(0.9, vy / 600)));
      ctx.fillStyle = "#6b4226";
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3b2314";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.6, 0, 0, r);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = ink.text;
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(pts), W / 2, 44);

      if (!alive) {
        if (saveBest("flap", pts)) {
          setBestScore(pts);
          setBurst((b) => b + 1);
        }
        setState("over");
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("pointerdown", hop);
      window.removeEventListener("keydown", key);
    };
  }, [state, accent]);

  return (
    <div className="relative overflow-hidden border" style={boardStyle}>
      <canvas ref={canvasRef} className="block h-[440px] w-full touch-none" />
      {state !== "play" && (
        <Overlay
          accent={accent}
          burst={burst}
          title={state === "over" ? "Steamed" : undefined}
          big={state === "over" ? score : undefined}
          bestLabel={bestScore > 0 ? `Best on this phone: ${bestScore}` : null}
          cta={state === "over" ? "Again" : "Start"}
          hint="Tap to hop. Thread the steam."
          onStart={() => {
            setScore(0);
            setBestScore(best("flap"));
            setState("play");
          }}
        />
      )}
    </div>
  );
}
