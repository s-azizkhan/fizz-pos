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

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
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
