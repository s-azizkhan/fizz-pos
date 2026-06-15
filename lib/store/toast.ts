import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastState = {
  toasts: Toast[];
  seq: number;
  push: (type: ToastType, message: string, ms?: number) => number;
  dismiss: (id: number) => void;
};

// Client-only transient notifications. Toasts are never created during SSR
// (only from user-triggered events), so the incrementing id is safe.
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  seq: 0,
  push: (type, message, ms = 4000) => {
    const id = get().seq + 1;
    set((s) => ({ seq: id, toasts: [...s.toasts, { id, type, message }] }));
    if (ms > 0) {
      setTimeout(() => get().dismiss(id), ms);
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Imperative API for event handlers (deletes, async transitions, etc.).
export const toast = {
  success: (message: string, ms?: number) =>
    useToastStore.getState().push("success", message, ms),
  error: (message: string, ms?: number) =>
    useToastStore.getState().push("error", message, ms),
  info: (message: string, ms?: number) =>
    useToastStore.getState().push("info", message, ms),
};
