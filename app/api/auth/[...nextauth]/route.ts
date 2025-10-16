// app/api/auth/[...nextauth]/route.ts
// Purpose: Bind the NextAuth HTTP handlers (GET/POST) to the API route.
// These handlers come from `NextAuth(authConfig)` in lib/auth.ts.
// They power the entire auth flow, including:
// - /api/auth/signin (where the login page's signIn("vipps") posts to)
// - /api/auth/callback/vipps (Vipps redirects here after the user approves)
// - session/jwt endpoints used by NextAuth.
//
// Without this file, signIn("vipps") and the Vipps OAuth callback would not work.

import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
