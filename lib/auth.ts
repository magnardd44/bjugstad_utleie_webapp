// lib/auth.ts
// Purpose: The single source of truth for NextAuth config.
// - Wires the Vipps provider (prod) and a Credentials provider (dev convenience).
// - Uses PrismaAdapter to store users/accounts in your DB.
// - Shapes the JWT/session so the client (`useSession`) and middleware (`auth()`) can read flags.
// - Exports `handlers` (used by app/api/auth/[...nextauth]/route.ts), `auth` (server helper),
//   and server-side `signIn/signOut` helpers.
//
// Vipps specifics:
// - clientId, clientSecret, and issuer are read from env vars. `issuer` differs for apitest vs prod.
// - When the login page calls signIn("vipps"), NextAuth redirects to Vipps,
//   then Vipps redirects back to /api/auth/callback/vipps, which is served by `handlers` below.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import Vipps from "next-auth/providers/vipps";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { IS_DEV } from "./constants";
import { USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY } from "./constants";


export const authConfig: NextAuthConfig = {
  // Persist users/accounts (e.g., Vipps <-> local user link) in your database
  adapter: PrismaAdapter(prisma),

  // JWT sessions (no DB-backed sessions). Middleware and client read from the JWT.
  session: { strategy: "jwt" },

  // Debug helps in dev; avoid in prod as it leaks info to the client
  debug: IS_DEV,

  providers: [
    // === Vipps (production) ===
    Vipps({
      // Set these in .env(.local) from the Vipps MobilePay portal:
      // AUTH_VIPPS_ID, AUTH_VIPPS_SECRET, AUTH_VIPPS_ISSUER
      // issuer example: https://apitest.vipps.no (dev) or https://api.vipps.no (prod)
      clientId: process.env.AUTH_VIPPS_ID!,
      clientSecret: process.env.AUTH_VIPPS_SECRET!,
      issuer: process.env.AUTH_VIPPS_ISSUER, // apitest in dev, api in prod
    }),

    // === Credentials (added in DEV only if flagged) ===
    // Allows signIn("credentials") from the login page without hitting Vipps.
    ...(IS_DEV && USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY
      ? [
        Credentials({
          name: "Dev Login",
          credentials: {}, // no form; triggered programmatically
          async authorize() {
            // Return a minimal user-like object. With session:'jwt',
            // it doesn't need to exist in the DB.
            return {
              id: "dev-user",
              name: "Dev User",
              email: "dev@example.com",
            };
          },
        }),
      ]
      : []),
  ],

  // If NextAuth needs to prompt for login, it sends users here.
  // Your middleware also redirects unauthenticated users here.
  pages: {
    signIn: "/login",
  },

  callbacks: {
    // Runs whenever a JWT is created/updated (e.g., after Vipps callback).
    // Put extra fields you care about onto the token.
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        // @ts-expect-error - custom column on your Prisma User model
        token.acceptedTerms = user.acceptedTerms ?? false;

        // In dev, pretend terms are accepted so middleware doesn't bounce you (only if using Credentials provider).
        if (IS_DEV && USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY) {
          token.acceptedTerms = true;
        }

      }
      return token;
    },

    // Shape what `useSession()` sees on the client.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.acceptedTerms = (token.acceptedTerms as boolean) ?? false;
      }
      return session;
    },
  },
  // Other defaults (cookies, CSRF) can be tuned here if needed.
};

// Export the NextAuth-bound pieces used across the app:
// - `handlers`: bound to /api/auth/[...nextauth] (serves Vipps signin/callback endpoints).
// - `auth`: server helper to read the current session (used by middleware, route handlers, RSC).
// - `signIn`/`signOut`: server-side helpers if you need them in actions/handlers.
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
