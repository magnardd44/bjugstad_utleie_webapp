// lib/auth-edge.ts
// Purpose: Edge-safe NextAuth config used by middleware (and any Edge runtime code).
// IMPORTANT: Do NOT import Prisma or the Prisma adapter here — the Edge runtime
// cannot load Node-native binaries, and bundling them can cause WASM compile errors.

import NextAuth from "next-auth";
import Vipps from "next-auth/providers/vipps";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { IS_DEV, USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY } from "./constants";

const edgeAuthConfig: NextAuthConfig = {
  // Keep sessions JWT-only; no DB lookups required in the Edge runtime.
  session: { strategy: "jwt" },
  debug: IS_DEV,
  providers: [
    Vipps({
      clientId: process.env.AUTH_VIPPS_ID!,
      clientSecret: process.env.AUTH_VIPPS_SECRET!,
      issuer: process.env.AUTH_VIPPS_ISSUER,
    }),
    ...(IS_DEV && USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY
      ? [
        Credentials({
          name: "Dev Login",
          credentials: {},
          async authorize() {
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
  pages: {
    signIn: "/login",
    newUser: "/onboarding", // redirect new users to onboarding
  },
  callbacks: {
    // NOTE: No DB work in Edge. The OAuthAccountNotLinked redirect
    // happens in the Node runtime (lib/auth.ts) during the real OAuth flow.

    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        // Carry dev flag so middleware can allow navigation during local dev if desired
        // @ts-expect-error - custom token field
        token.acceptedTerms = (user as any).acceptedTerms ?? false;
        if (IS_DEV && USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY) {
          // Shortcut in dev so middleware doesn't bounce you around
          // @ts-expect-error - custom token field
          token.acceptedTerms = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error - augmented session type provided in types/next-auth.d.ts
        session.user.id = token.uid as string;
        // @ts-expect-error - augmented session type provided in types/next-auth.d.ts
        session.user.acceptedTerms = (token as any).acceptedTerms ?? false;
      }
      return session;
    },
  },
};

// Export only the Edge-safe helper used by middleware.
export const { auth } = NextAuth(edgeAuthConfig);
