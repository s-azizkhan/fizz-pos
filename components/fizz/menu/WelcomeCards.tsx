"use client";

import { useState, type ReactNode } from "react";
import type { CardKind, WelcomeCard } from "@/lib/store/welcome";

// Card + icon primitives for the welcome screen. Client file because the
// Wi-Fi card toggles open; the rest is plain markup reused by the admin preview.

export function CardShell({
  href,
  onClick,
  primary,
  accent,
  external,
  icon,
  title,
  subtitle,
  trailing,
}: {
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  accent: string;
  external?: boolean;
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  const cls = `wl-card ${primary ? "wl-primary" : ""} flex w-full items-center gap-4 border p-4 text-left`;
  const style = {
    borderRadius: "var(--m-radius)",
    backgroundColor: primary ? `${accent}1F` : "var(--m-surface)",
    borderColor: primary ? `${accent}66` : "var(--m-line)",
  };
  const inner = (
    <>
      <span
        className="wl-tile flex h-14 w-14 shrink-0 items-center justify-center"
        style={{ borderRadius: "calc(var(--m-radius) - 4px)", backgroundColor: `${accent}26`, color: accent }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[18px] font-bold leading-tight">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[13px] text-[var(--m-muted)]">{subtitle}</span>}
      </span>
      <span className="wl-chev shrink-0 text-[var(--m-muted)]">{trailing ?? <Chevron />}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} style={style}>
        {inner}
      </button>
    );
  }
  return (
    <a href={href} className={cls} style={style} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {inner}
    </a>
  );
}

// Tap to reveal the network + password; copy with one more tap.
export function WifiCard({ card, accent, index }: { card: WelcomeCard; accent: string; index: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(card.password ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <li className="wl-in" style={{ "--i": index } as React.CSSProperties}>
      <CardShell
        onClick={() => setOpen((v) => !v)}
        accent={accent}
        icon={<CardIcon kind="wifi" />}
        title={card.title}
        subtitle={open ? `Network: ${card.ssid}` : card.subtitle}
        trailing={<Chevron className={open ? "rotate-90" : ""} />}
      />
      {open && (
        <div
          className="wl-in mt-2 flex items-center justify-between gap-3 border px-4 py-3"
          style={{ borderRadius: "var(--m-radius)", borderColor: "var(--m-line)", backgroundColor: "var(--m-surface)" }}
        >
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--m-muted)]">Password</span>
            <span className="block truncate font-mono text-[16px]">{card.password || "No password"}</span>
          </span>
          {card.password && (
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-full px-4 py-2 text-[13px] font-bold"
              style={{ backgroundColor: accent, color: "var(--m-bg)" }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 transition-transform ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

const ICON: Record<CardKind, ReactNode> = {
  menu: <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4zm0 0v14M9 8h6M9 12h6" />,
  review: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z" />,
  wifi: (
    <>
      <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </>
  ),
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  whatsapp: (
    <>
      <path d="M3 21l1.65-4.9A9 9 0 1 1 8 19.4L3 21z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.5-2-1-.8.7c-.9-.4-1.6-1.1-2-2l.7-.8-1-2L9 9.5z" />
    </>
  ),
  link: (
    <>
      <rect x="2" y="7" width="20" height="12" rx="4" />
      <path d="M7 11v4M5 13h4M15 12h.01M18 14h.01" />
    </>
  ),
};

export function CardIcon({ kind }: { kind: CardKind }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON[kind]}
    </svg>
  );
}

// Brand glyph from the link's host; anything else gets a globe.
export function SocialIcon({ url }: { url: string }) {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const p = (d: ReactNode) => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
  if (host.includes("instagram"))
    return p(
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </>,
    );
  if (host.includes("facebook") || host === "fb.com")
    return p(<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />);
  if (host.includes("tiktok"))
    return p(<path d="M14 3v10.5a3.5 3.5 0 1 1-3-3.46M14 3c0 3 2.5 5 5 5" />);
  if (host === "x.com" || host.includes("twitter"))
    return p(<path d="M4 4l16 16M20 4L4 20" />);
  if (host.includes("youtube"))
    return p(
      <>
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" />
      </>,
    );
  if (host.includes("google") || host.includes("g.page") || host.includes("maps"))
    return p(
      <>
        <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
        <circle cx="12" cy="10" r="2" />
      </>,
    );
  return p(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </>,
  );
}
