// components/AuthProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // no props needed; it will fetch /api/auth/session
  return <SessionProvider>{children}</SessionProvider>;
}
