"use client";

import type { LoadedOrder } from "./types";

// Hand an open tab from the Orders page to the POS through the device. Online
// the POS loads the tab from the server; when the network can't answer, the
// POS opens from its cached copy and picks the tab up from here instead.
// sessionStorage: survives the full-page fallback navigation, dies with the tab.
const key = (id: string) => `fizz-tab:${id}`;

export function stashTab(tab: LoadedOrder) {
  try {
    sessionStorage.setItem(key(tab.id), JSON.stringify(tab));
  } catch {
    // Storage blocked — the online path still works.
  }
}

export function stashedTab(id: string): LoadedOrder | null {
  try {
    return JSON.parse(sessionStorage.getItem(key(id)) ?? "null");
  } catch {
    return null;
  }
}
