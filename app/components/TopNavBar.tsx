'use client';

/**
 * app/components/TopNavBar.tsx
 * Replaces the sidebar: logo on the left, the same 7 routes in the centre,
 * notifications + account on the right. Collapses to a menu button on small screens.
 * Tailwind only, inline SVG icons (no lucide needed here).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { name: 'Overview', href: '/dashboard' },
  { name: 'Requests', href: '/requests' },
  { name: 'Attendance', href: '/attendance' },
  { name: 'Employees', href: '/employees' },
  { name: 'Payroll', href: '/payroll' },
  { name: 'Audit Log', href: '/audit' },
  { name: 'Settings', href: '/settings' },
];

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function TopNavBar({
  notificationCount = 0,
  userName = 'Admin',
}: {
  notificationCount?: number;
  userName?: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href ||
    (href === '/dashboard' && pathname === '/') ||
    (href !== '/dashboard' && pathname.startsWith(`${href}/`));

  return (
    <header className="relative z-40 bg-white">
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-6 px-5 lg:px-10">
        {/* logo */}
        <Link href="/dashboard" className="flex items-center" aria-label="Nandgate IT home">
          <Image
            src="/logo.png"
            alt="Nandgate IT Logo"
            width={160}
            height={36}
            className="h-9 w-auto object-contain object-left"
            priority
          />
        </Link>

        {/* links (desktop) */}
        <nav className="hidden items-center justify-center gap-7 lg:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative py-5 text-[13px] font-semibold transition-colors ${
                  active ? 'text-[#0f172a]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {item.name}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#7BBDE8]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* spacer so actions stay right on mobile */}
        <div className="col-start-3 flex items-center justify-self-end gap-4 text-slate-600 lg:col-start-3">
          <Link
            href="/requests"
            aria-label="Pending requests"
            className="relative transition-colors hover:text-[#1b64da]"
          >
            <BellIcon />
            {notificationCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1b64da] px-1 text-[9px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white py-1 pl-3 pr-1.5 shadow-sm">
            <span className="hidden text-sm font-semibold text-slate-700 sm:inline">{userName}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7BBDE8] text-sm font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* mobile menu button */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* mobile dropdown */}
      {menuOpen && (
        <nav className="border-t border-slate-100 bg-white px-5 pb-4 pt-2 lg:hidden" aria-label="Mobile">
          <div className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
                    active ? 'bg-[#7BBDE8] text-white' : 'text-slate-600 hover:bg-[#f0f6fa]'
                  }`}
                >
                  {item.name}
                  <ChevronDown />
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}