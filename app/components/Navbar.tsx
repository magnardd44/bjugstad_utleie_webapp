'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SideNav() {
  const pathname = usePathname();

  const links = [
    { href: '/',        label: 'Oversikt' },
    { href: '/kjoretoy', label: 'Kjøretøy' },
    { href: '/kart', label: 'Kart' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-48 border-r bg-gray-50">
      <nav className="flex flex-col gap-2 p-4">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded px-3 py-2 text-sm font-medium transition
              ${pathname === href
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-200'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
