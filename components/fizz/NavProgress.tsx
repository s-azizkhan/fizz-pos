"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    __fizzNav?: { on: (el?: Element | null) => void; off: () => void; last: Element | null; ready?: boolean };
  }
}

// Runs inline before hydration, so taps land feedback even while the JS/CSS
// bundles are still loading. Internal link taps light the lime bar and pulse
// the pressed control; a button tapped before hydration does the same until
// React takes over. NavProgress clears it once the new URL commits.
// ponytail: 15s safety timeout covers navigations that never commit.
export const NAV_SCRIPT = `(function(){
var d=document.documentElement,t;
function off(){d.removeAttribute('data-nav');document.querySelectorAll('[data-nav-pending]').forEach(function(e){e.removeAttribute('data-nav-pending')})}
function on(el){d.setAttribute('data-nav','');if(el&&el.isConnected)el.setAttribute('data-nav-pending','');clearTimeout(t);t=setTimeout(off,15000)}
var n=window.__fizzNav={on:on,off:off,last:null};
document.addEventListener('click',function(e){
var el=e.target&&e.target.closest?e.target.closest('a[href],button'):null;n.last=el;
if(!el||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
if(el.tagName==='A'){
if((el.target&&el.target!=='_self')||el.hasAttribute('download'))return;
var u=new URL(el.href,location.href);
if(u.origin!==location.origin||(u.pathname===location.pathname&&u.search===location.search))return;
on(el);
}else if(!n.ready){on(el)}
},true);
})();`;

// Call right before a router.push/replace from a button: marks the last
// pressed control pending and shows the bar until the route commits.
export function startNav() {
  const n = window.__fizzNav;
  n?.on(n.last);
}

export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const n = window.__fizzNav;
    if (!n) return;
    n.ready = true;
    n.off();
  }, [pathname, search]);

  return null;
}
