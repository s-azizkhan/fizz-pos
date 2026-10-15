import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "fizz_session";

// Optimistic check only: verify the cookie's signature, no DB hit. Real
// authorization happens in the DAL close to the data. Kept self-contained so
// it stays Edge-compatible (no next/headers, no server-only imports).
async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

// Hosts that are "ours". Anything else is a café's own domain (store.menuDomain)
// and serves only the public menu: "/" → "/m/~", resolved from the host in
// getPublicMenu. Dashboard/login never answer there. No DB here (Edge), so an
// unknown host just 404s on the menu page.
function isOurHost(host: string): boolean {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "";
  const primary = site.replace(/^https?:\/\//, "").split("/")[0];
  const bare = host.split(":")[0];
  return (
    !primary ||
    bare === primary ||
    bare === "localhost" ||
    /^(\d+\.){3}\d+$/.test(bare) ||
    bare.endsWith(".vercel.app") ||
    bare.endsWith(`.${primary}`)
  );
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!isOurHost(host)) {
    const url = req.nextUrl.clone();
    url.pathname = `/m/~${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }
  const isProtected = path.startsWith("/dashboard");
  const isAuthPage = path === "/login";

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await hasValidSession(token);

  if (isProtected && !authed) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isAuthPage && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
