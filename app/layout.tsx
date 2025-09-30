// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideNav from "@/components/Navbar";
import { auth } from "@/lib/auth";
import AuthProvider from "@/components/AuthProvider";
import MachinesProviderServer from "@/components/MachinesProvider.server";
import { Suspense } from "react";
import Spinner from "@/components/Spinner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bjugstad Utleie",
  description: "Bjugstad Utleie Web App",
};

// Let the data provider control its own ISR; keep the layout dynamic
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAuthed = !!session; // keep your dev-bypass here if needed

  return (
    <html lang="no">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Session provider available app-wide */}
        <AuthProvider>
          {isAuthed ? (
            <>
              <SideNav />
              <Suspense fallback={
                <main className="md:ml-60 min-h-screen">
                  <Spinner label="Laster side..." />
                </main>
              }>
              {/* Preload machines once per login/refresh and share via context */}
              <MachinesProviderServer>
                <main className="md:ml-60 min-h-screen overflow-y-auto">{children}</main>
              </MachinesProviderServer>
              </Suspense>
            </>
          ) : (
            <main className="min-h-screen overflow-y-auto">{children}</main>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
