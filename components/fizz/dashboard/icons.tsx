// Inline icon set — no icon dep. 20×20, currentColor, 1.6 stroke.
// Each icon carries a micro-animation (`fz-*` classes in globals.css) that
// plays when its host link/button is hovered, or when the host is the
// current page (`aria-current="page"`). Reduced-motion users get none.
type P = { className?: string };
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ className, name, children }: P & { name: string; children: React.ReactNode }) {
  return (
    <svg {...base} className={`fz-icon fz-${name} overflow-visible ${className ?? ""}`} aria-hidden>
      {children}
    </svg>
  );
}

// Dashboard — tiles shuffle in a stagger.
export function GridIcon({ className }: P) {
  return (
    <Svg name="grid" className={className}>
      <rect className="fz-t1" x="3" y="3" width="7" height="9" rx="1.5" />
      <rect className="fz-t2" x="14" y="3" width="7" height="5" rx="1.5" />
      <rect className="fz-t3" x="14" y="12" width="7" height="9" rx="1.5" />
      <rect className="fz-t4" x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  );
}

// POS — card terminal, card slides in.
export function PosIcon({ className }: P) {
  return (
    <Svg name="pos" className={className}>
      <rect x="5" y="8" width="14" height="13" rx="2" />
      <path d="M8.5 12h7M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01" />
      <path className="fz-card" d="M8 8V3.5A.5.5 0 0 1 8.5 3h7a.5.5 0 0 1 .5.5V8" />
    </Svg>
  );
}

// KOT — chef hat, steam rises.
export function ChefIcon({ className }: P) {
  return (
    <Svg name="chef" className={className}>
      <path d="M7 14.5a4 4 0 0 1-.6-7.9 5 5 0 0 1 9.2-1.1 4 4 0 0 1 2.4 7.6V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5.5Z" />
      <path d="M7 17.5h10" />
      <path className="fz-steam" d="M10 12v1.5M14 12v1.5" />
    </Svg>
  );
}

// Orders — receipt prints upward.
export function ReceiptIcon({ className }: P) {
  return (
    <Svg name="receipt" className={className}>
      <g className="fz-paper">
        <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3 5 4.5Z" />
        <path className="fz-l1" pathLength={1} d="M8 8h8" />
        <path className="fz-l2" pathLength={1} d="M8 12h8" />
        <path className="fz-l3" pathLength={1} d="M8 16h5" />
      </g>
    </Svg>
  );
}

// Menu — book with a page flip.
export function MenuBookIcon({ className }: P) {
  return (
    <Svg name="book" className={className}>
      <path d="M12 6.5C10.5 5 8 4 4 4v14c4 0 6.5 1 8 2.5 1.5-1.5 4-2.5 8-2.5V4c-4 0-6.5 1-8 2.5Z" />
      <path d="M12 6.5v14" />
      <path className="fz-page" d="M12 6.5c1.2-1.2 3-1.9 5.5-2.2v13.5c-2.5.3-4.3 1-5.5 2.2" />
    </Svg>
  );
}

// Daily sales — coin drops into the till slot.
export function CashIcon({ className }: P) {
  return (
    <Svg name="cash" className={className}>
      <path d="M3 13h18v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z" />
      <path d="M9 13h6" />
      <circle className="fz-coin" cx="12" cy="7" r="3.5" />
      <path className="fz-coin" d="M12 5.6v2.8" />
    </Svg>
  );
}

// Expenses — wallet, flap opens.
export function WalletIcon({ className }: P) {
  return (
    <Svg name="wallet" className={className}>
      <path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3" />
      <path d="M3 6v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
      <path className="fz-flap" d="M21 12h-4a2 2 0 0 0 0 4h4v-4Z" />
    </Svg>
  );
}

// Inventory — crate lid lifts.
export function BoxIcon({ className }: P) {
  return (
    <Svg name="box" className={className}>
      <path d="M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" />
      <path d="M10 13h4" />
      <rect className="fz-lid" x="3" y="4" width="18" height="5" rx="1" />
    </Svg>
  );
}

// Margins — coffee cup with cost slice; % ticks.
export function MarginIcon({ className }: P) {
  return (
    <Svg name="margin" className={className}>
      <path d="M5 8h12v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z" />
      <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path className="fz-fill" d="M5.6 13h10.8" />
      <path className="fz-steam" d="M9 2.5v2M13 2.5v2" />
    </Svg>
  );
}

// Analytics — line draws itself.
export function TrendIcon({ className }: P) {
  return (
    <Svg name="trend" className={className}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path className="fz-draw" pathLength={1} d="m7 15 4-4 3 3 6-6" />
      <path className="fz-arrow" d="M16 8h4v4" />
    </Svg>
  );
}

// Daily report — clipboard, tick draws.
export function ReportIcon({ className }: P) {
  return (
    <Svg name="report" className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2.5h6a1 1 0 0 1 1 1V5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path className="fz-draw" pathLength={1} d="m9 13 2 2 4-4" />
    </Svg>
  );
}

// Team — people, second one bobs in.
export function UsersIcon({ className }: P) {
  return (
    <Svg name="users" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <g className="fz-buddy">
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
      </g>
    </Svg>
  );
}

// Customers — a contact card.
export function ContactIcon({ className }: P) {
  return (
    <Svg name="contact" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3" />
    </Svg>
  );
}

// Printers — paper feeds out.
export function PrinterIcon({ className }: P) {
  return (
    <Svg name="printer" className={className}>
      <path d="M7 9V3h10v6" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M17.5 12h.01" />
      <g className="fz-feed">
        <path d="M7 14h10v7H7z" />
        <path d="M9.5 17h5" />
      </g>
    </Svg>
  );
}

// Store settings — gear spins.
export function GearIcon({ className }: P) {
  return (
    <Svg name="gear" className={className}>
      <g className="fz-spin">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </Svg>
  );
}

// Help — question mark nods.
export function HelpIcon({ className }: P) {
  return (
    <Svg name="help" className={className}>
      <circle cx="12" cy="12" r="9" />
      <g className="fz-nod">
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
        <path d="M12 17h.01" />
      </g>
    </Svg>
  );
}

export function ChevronIcon({ className }: P) {
  return (
    <Svg name="chevron" className={className}>
      <path className="fz-nudge-l" d="m15 18-6-6 6-6" />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: P) {
  return (
    <Svg name="arrow" className={className}>
      <path className="fz-nudge-r" d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function LogoutIcon({ className }: P) {
  return (
    <Svg name="logout" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path className="fz-nudge-r" d="M16 17l5-5-5-5M21 12H9" />
    </Svg>
  );
}

export function MoreIcon({ className }: P) {
  return (
    <Svg name="more" className={className}>
      <circle className="fz-d1" cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle className="fz-d2" cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle className="fz-d3" cx="19" cy="12" r="1.2" fill="currentColor" />
    </Svg>
  );
}

// Burger ⇄ close morph: pass `open`.
export function MenuToggleIcon({ open, className }: P & { open: boolean }) {
  return (
    <Svg name="burger" className={`${open ? "is-open" : ""} ${className ?? ""}`}>
      <path className="fz-b1" d="M4 7h16" />
      <path className="fz-b2" d="M4 12h16" />
      <path className="fz-b3" d="M4 17h16" />
    </Svg>
  );
}

export function CloseIcon({ className }: P) {
  return (
    <Svg name="close" className={className}>
      <g className="fz-twist">
        <path d="M18 6 6 18M6 6l12 12" />
      </g>
    </Svg>
  );
}

// Check / cross draw in on mount — good for list bullets and toasts.
export function CheckIcon({ className }: P) {
  return (
    <Svg name="check" className={className}>
      <path className="fz-draw-in" pathLength={1} d="M4 12.5 9.5 18 20 6.5" />
    </Svg>
  );
}

export function MinusIcon({ className }: P) {
  return (
    <Svg name="minus" className={className}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function TrashIcon({ className }: P) {
  return (
    <Svg name="trash" className={className}>
      <g className="fz-lid">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      </g>
      <path d="M5 6v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6M10 11v6M14 11v6" />
    </Svg>
  );
}

export function AlertIcon({ className }: P) {
  return (
    <Svg name="alert" className={className}>
      <circle className="fz-ping" cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </Svg>
  );
}

export function InfoIcon({ className }: P) {
  return (
    <Svg name="info" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </Svg>
  );
}

export function ArrowUpIcon({ className }: P) {
  return (
    <Svg name="up" className={className}>
      <path className="fz-bob-up" d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function ArrowDownIcon({ className }: P) {
  return (
    <Svg name="down" className={className}>
      <path className="fz-bob-down" d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  );
}

export function AdjustIcon({ className }: P) {
  return (
    <Svg name="adjust" className={className}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle className="fz-knob1" cx="16" cy="7" r="2" />
      <circle className="fz-knob2" cx="8" cy="17" r="2" />
    </Svg>
  );
}

export function CalendarIcon({ className }: P) {
  return (
    <Svg name="calendar" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path className="fz-ring" d="M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </Svg>
  );
}

export function EyeIcon({ className }: P) {
  return (
    <Svg name="eye" className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle className="fz-blink" cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function EyeOffIcon({ className }: P) {
  return (
    <Svg name="eyeoff" className={className}>
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path className="fz-draw" pathLength={1} d="M3 3l18 18" />
    </Svg>
  );
}

export function PlusIcon({ className }: P) {
  return (
    <Svg name="plus" className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function PencilIcon({ className }: P) {
  return (
    <Svg name="pencil" className={className}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
    </Svg>
  );
}

export function WhatsAppIcon({ className }: P) {
  return (
    <Svg name="whatsapp" className={className}>
      <path d="M3 21l1.65-4.9A9 9 0 1 1 8 19.4L3 21z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.5-2-1-.8.7c-.9-.4-1.6-1.1-2-2l.7-.8-1-2L9 9.5z" />
    </Svg>
  );
}
