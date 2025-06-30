'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon,
  ListBulletIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

import { FaRegMap } from "react-icons/fa";


type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function SideNav() {
  const pathname = usePathname();

  const items: Item[] = [
    { href: '/avtaler',          label: 'Aktive Avtaler',  icon: <ListBulletIcon className="h-5 w-5" /> },
    { href: '/historikk', label: 'Avtalehistorikk', icon: <Squares2X2Icon className="h-5 w-5" /> },
    { href: '/dokumenter',       label: 'Dokumenter',      icon: <DocumentTextIcon className="h-5 w-5" /> },
    { href: '/kart',       label: 'Kart',      icon: <FaRegMap className="h-5 w-5" /> },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-gradient-to-b from-[#001a4d] via-[#002c6d] to-[#1c1464]">
      <div className="flex h-16 items-center border-b border-white/10 px-6 text-lg font-semibold text-white">
        Bjugstad kundeportal
      </div>
      <nav className="mt-4 flex flex-col gap-1 px-4">
        {items.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm font-medium
                transition-colors
                ${active
                  ? 'bg-white/20 text-white'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
