// middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Allow static assets and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map|pdf|txt|woff2?|ttf|eot)$/i.test(pathname) ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const session = await auth();

  // ✅ If user is already logged in and hits /login, bounce to callback or /avtaler
  if (session && pathname === "/login") {
    const target = url.searchParams.get("callbackUrl") || "/avtaler";
    return NextResponse.redirect(new URL(target, url.origin));
  }

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  // Require auth for everything else
  if (!session) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

// Only run on routes that aren't static files, Next internals, or auth endpoints
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map|pdf|txt|woff|woff2|ttf|eot)$).*)",
  ],
};
