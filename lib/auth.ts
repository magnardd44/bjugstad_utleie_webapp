// lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import Vipps from "next-auth/providers/vipps";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";


export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // easiest for middleware checks
  providers: [
    Vipps({
      clientId: process.env.AUTH_VIPPS_ID!,
      clientSecret: process.env.AUTH_VIPPS_SECRET!,
      issuer: process.env.AUTH_VIPPS_ISSUER, // apitest in dev, api in prod
    }),

    // Dev-only provider
    ...(process.env.NODE_ENV === "development"
      ? [
          Credentials({
            name: "Dev Login",
            credentials: {}, // no form, we trigger programmatically
            async authorize() {
              // Return a minimal user-like object.
              // With session: 'jwt', it does NOT need to exist in DB.
              return {
                id: "dev-user",
                name: "Dev User",
                email: "dev@example.com",
                // you can add whatever you project reads later
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // put onboarding flags onto the JWT
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        // @ts-expect-error - extra columns exist on Prisma User
        token.acceptedTerms = user.acceptedTerms ?? false;

        // Dev convenience: mark terms accepted so middleware doesn’t redirect
        if (process.env.NODE_ENV === "development") {
          token.acceptedTerms = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.acceptedTerms = (token.acceptedTerms as boolean) ?? false;
      }
      return session;
    },
  },
  // good defaults; tweak cookies, CSRF, etc. as needed
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
