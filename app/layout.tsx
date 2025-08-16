// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideNav from "../components/Navbar";
import { auth } from "@/lib/auth";
import AuthProvider from "@/components/AuthProvider";  // <-- add

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bjugstad Utleie",
  description: "Bjugstad Utleie Web App",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); // server-side check for showing the sidebar
  const isAuthed = !!session;   // or your dev-bypass logic if you still use it

  return (
    <html lang="no">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {isAuthed ? <SideNav /> : null}

        {/* Provide session to all client pages/components */}
        <AuthProvider>
          <main className={isAuthed ? "md:ml-60 min-h-screen overflow-y-auto" : "min-h-screen overflow-y-auto"}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
