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

    // Keep offline copies of the floor screens fresh: on load, on reconnect,
    // and every 5 min while open. The worker throttles and skips signed-out.
    const warm = () => {
      if (!navigator.onLine || !location.pathname.startsWith("/dashboard")) return;
      navigator.serviceWorker.ready.then((r) => r.active?.postMessage("warm"));
    };
    warm();
    window.addEventListener("online", warm);
    const t = setInterval(warm, 5 * 60_000);

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
      clearInterval(t);
    };
  }, []);

  return null;
}
