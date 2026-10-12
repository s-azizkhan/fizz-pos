"use client";

import dynamic from "next/dynamic";

// Agentation feedback toolbar, dev only. The NODE_ENV check sits around the
// import itself so the production build drops it entirely — gating only the
// JSX still shipped ~97KB gz to every route, login included.
const DevToolbar =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => m.Agentation), { ssr: false })
    : () => null;

export default DevToolbar;
