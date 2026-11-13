'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Clock,
  Users,
  Wallet,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { name: 'Requests', href: '/requests', icon: CalendarCheck, badge: null },
  { name: 'Attendance', href: '/attendance', icon: Clock, badge: null },
  { name: 'Compensatory Days', href: '/compensatory-days', icon: CalendarDays, badge: null },
  { name: 'Employees', href: '/employees', icon: Users, badge: null },
  { name: 'Payroll', href: '/payroll', icon: Wallet, badge: null },
  { name: 'Audit Log', href: '/audit', icon: FileText, badge: null },
  { name: 'Settings', href: '/settings', icon: Settings, badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-[280px] xl:w-[300px] flex-shrink-0 flex flex-col bg-[#c8d9e6]/40 border-r border-slate-200/60 p-5 lg:h-screen lg:sticky lg:top-0 overflow-y-auto">

      <div className="space-y-8">

        {/* Brand Logo */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-center w-full min-h-[48px]">
            <Link
              href="/dashboard"
              className="relative w-full h-12 flex items-center justify-start"
            >
              <Image
                src="/logo.png"
                alt="Nandgate IT Logo"
                width={220}
                height={48}
                className="object-contain object-left"
                priority
              />
            </Link>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              (item.href === '/dashboard' && pathname === '/') ||
              (item.href !== '/dashboard' &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#7BBDE8] text-white shadow-md shadow-[#7BBDE8]/25'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />

                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}

                  <ChevronRight
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-300 group-hover:text-slate-400'
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}