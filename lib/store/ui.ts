import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  // Sticky "you're on the list" flag so the success state survives in-page nav.
  joined: boolean;
  setJoined: (v: boolean) => void;
  // Dashboard sidebar.
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
};

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      mobileNavOpen: false,
      toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
      closeMobileNav: () => set({ mobileNavOpen: false }),
      joined: false,
      setJoined: (v) => set({ joined: v }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      mobileSidebarOpen: false,
      toggleMobileSidebar: () =>
        set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
    }),
    {
      name: "fizz-ui",
      // Only the collapse preference survives reloads.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
