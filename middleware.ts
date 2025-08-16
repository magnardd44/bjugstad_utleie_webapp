// middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 1) Allow static assets (served from /public at the URL root) and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map|pdf|txt|woff2?|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2) Public routes that should not require auth
  const publicPaths = ["/login", "/api/auth", "/onboarding"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  
  // 3) Auth-gate everything else
  const session = await auth();
  if (!session) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // 4) Force onboarding (terms) before app
  // // @ts-expect-error augmented type on Session.user
  const accepted = session.user?.acceptedTerms === true;
  if (!accepted && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", url.origin));
  }

  return NextResponse.next();
}

// Only run on routes that aren't static files, Next internals, or auth endpoints
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|css|js|map|pdf|txt|woff|woff2|ttf|eot)$).*)",
  ],
};
