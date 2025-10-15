// components/Navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bars3Icon,
  XMarkIcon,
  ListBulletIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  MapIcon,
  UserIcon,
  ArrowLeftEndOnRectangleIcon, // logout icon
} from "@heroicons/react/24/outline";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function ResponsiveNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const items: NavItem[] = [
    { href: "/avtaler", label: "Aktive avtaler", icon: <ListBulletIcon className="h-5 w-5" /> },
    { href: "/historikk", label: "Avtalehistorikk", icon: <Squares2X2Icon className="h-5 w-5" /> },
    { href: "/dokumenter", label: "Dokumenter", icon: <DocumentTextIcon className="h-5 w-5" /> },
    { href: "/kart", label: "Kart", icon: <MapIcon className="h-5 w-5" /> },
    { href: "/profil", label: "Min profil", icon: <UserIcon className="h-5 w-5" /> },
  ];

  const renderLinks = () =>
    items.map(({ href, label, icon }) => {
      const active = pathname === href;
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors cursor-pointer
            ${active
              ? "bg-white/20 text-white"
              : "text-slate-200 hover:bg-white/10 hover:text-white"
            }`}
        >
          {icon}
          <span>{label}</span>
        </Link>
      );
    });

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <>
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center justify-between bg-gradient-to-b from-[#001a4d] via-[#002c6d] to-[#1c1464] p-4 text-white">
        <button onClick={() => setIsOpen(true)} aria-label="Open menu">
          <Bars3Icon className="h-6 w-6" />
        </button>
        <span className="font-semibold">Bjugstad kundeportal</span>
      </header>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:fixed md:inset-y-0 md:left-0 md:w-60
                   md:bg-gradient-to-b md:from-[#001a4d] md:via-[#002c6d] md:to-[#1c1464]
                   md:flex md:flex-col"
      >
        <div className="flex h-16 items-center border-b border-white/10 px-6 text-lg font-semibold text-white">
          Bjugstad kundeportal
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-4 flex-1">{renderLinks()}</nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-3">
          {/* DEV badge (only in dev mode) */}
          {isDev && (
            <div className="rounded bg-yellow-500 text-black text-xs font-bold px-2 py-1 text-center">
              DEV MODE
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full rounded px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <ArrowLeftEndOnRectangleIcon className="h-5 w-5" />
            <span>Logg ut</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-60
                    bg-gradient-to-b from-[#001a4d] via-[#002c6d] to-[#1c1464]
                    transform transition-transform duration-200 ease-in-out z-50
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsOpen(false)} aria-label="Close menu">
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-4">{renderLinks()}</nav>

        {/* Mobile logout button */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-3">
          {isDev && (
            <div className="rounded bg-yellow-500 text-black text-xs font-bold px-2 py-1 text-center">
              DEV MODE
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full rounded px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <ArrowLeftEndOnRectangleIcon className="h-5 w-5" />
            <span>Logg ut</span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        />
      )}
    </>
  );
}
