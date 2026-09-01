import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth/session";

// The only place a dead session can be cleared. proxy.ts trusts the JWT
// signature alone, so a token whose user no longer exists (removed from the
// team, wiped DB) still reads as "signed in" and bounces /login -> /dashboard,
// while the DAL bounces /dashboard -> /login: ERR_TOO_MANY_REDIRECTS. A Server
// Component can't delete a cookie, so the DAL sends dead sessions here instead.
export async function GET(req: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", req.nextUrl));
}
