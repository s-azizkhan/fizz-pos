import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaperWidth } from "@/lib/print/templates";

// Per-device printer prefs. Bluetooth pairing belongs to this browser on this
// device, so the default printer lives in localStorage, not the DB.
type PrinterState = {
  deviceId: string | null;
  deviceName: string | null;
  paper: PaperWidth;
  autoReceipt: boolean; // print the receipt when an order is paid
  autoKot: boolean; // print new lines for the kitchen on save / pay
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
      setPrinter: (p) => set({ deviceId: p?.id ?? null, deviceName: p?.name ?? null }),
      setPaper: (paper) => set({ paper }),
      setAuto: (p) => set(p),
    }),
    { name: "fizz-printer" },
  ),
);
