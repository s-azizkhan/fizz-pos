import { create } from "zustand";

type UiState = {
  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  // Sticky "you're on the list" flag so the success state survives in-page nav.
  joined: boolean;
  setJoined: (v: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  mobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  joined: false,
  setJoined: (v) => set({ joined: v }),
}));
