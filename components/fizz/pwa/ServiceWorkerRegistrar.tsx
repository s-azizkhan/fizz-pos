"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In dev, tear down any worker left behind by a prod build on this origin.
    // Otherwise it keeps intercepting navigations and serves the offline page
    // whenever the dev server isn't the one it was installed against.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => caches.keys())
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(console.error);
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Take the new worker as soon as it's ready rather than waiting for every
      // tab to close — a POS that quietly runs last week's build is worse than
      // one brief reload.
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            next.postMessage("skip-waiting");
          }
        });
      });
    }, console.error);

    // Keep offline copies of the floor screens fresh: shortly after load, on
    // reconnect, and every 15 min while open. Warming re-downloads four whole
    // pages, so it never competes with the page the user is waiting on: it
    // waits out the initial load, skips hidden tabs, and skips data-saver /
    // 2G links entirely. The worker throttles and skips signed-out.
    const warm = () => {
      const conn = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      if (
        !navigator.onLine ||
        document.visibilityState !== "visible" ||
        conn?.saveData ||
        /2g/.test(conn?.effectiveType ?? "") ||
        !location.pathname.startsWith("/dashboard")
      ) return;
      navigator.serviceWorker.ready.then((r) => r.active?.postMessage("warm"));
    };
    const first = setTimeout(warm, 10_000);
    window.addEventListener("online", warm);
    const t = setInterval(warm, 15 * 60_000);

    let reloading = false;
    const onChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      window.removeEventListener("online", warm);
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  return null;
}
