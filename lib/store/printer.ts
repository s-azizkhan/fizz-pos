import { create } from "zustand";
import { persist } from "zustand/middleware";
import { KOT_LAYOUT, RECEIPT_LAYOUT, type Block, type PaperWidth } from "@/lib/print/templates";

// Per-device printer prefs. Bluetooth pairing belongs to this browser on this
// device, so the default printer lives in localStorage, not the DB.
type PrinterState = {
  deviceId: string | null;
  deviceName: string | null;
  paper: PaperWidth;
  autoReceipt: boolean; // print the receipt when an order is paid
  autoKot: boolean; // print new lines for the kitchen on save / pay
  // Shop-wide ticket layouts, mirrored from the store row by
  // TicketLayoutSync.
  receipt: Block[];
  kot: Block[];
  // Printers feature switched off for the store: never talk to a device.
  // Set by PrinterKeepAlive from the dashboard layout.
  off: boolean;
  setPrinter: (p: { id: string; name: string } | null) => void;
  setPaper: (p: PaperWidth) => void;
  setAuto: (p: Partial<Pick<PrinterState, "autoReceipt" | "autoKot">>) => void;
};

export const usePrinter = create<PrinterState>()(
  persist(
    (set) => ({
      deviceId: null,
      deviceName: null,
      paper: 58,
      autoReceipt: true,
      autoKot: true,
      receipt: RECEIPT_LAYOUT,
      kot: KOT_LAYOUT,
      off: false,
      setPrinter: (p) => set({ deviceId: p?.id ?? null, deviceName: p?.name ?? null }),
      setPaper: (paper) => set({ paper }),
      setAuto: (p) => set(p),
    }),
    { name: "fizz-printer" },
  ),
);
