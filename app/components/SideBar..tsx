'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  Users,
  Wallet,
  FileText,
  Settings,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { name: 'Requests', href: '/requests', icon: CalendarCheck, badge: null },
  { name: 'Attendance', href: '/attendance', icon: Clock, badge: null },
  { name: 'Employees', href: '/employees', icon: Users, badge: null },
  { name: 'Payroll', href: '/payroll', icon: Wallet, badge: null },
  { name: 'Audit Log', href: '/audit-log', icon: FileText, badge: null },
  { name: 'Settings', href: '/settings', icon: Settings, badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    // INCREASED WIDTH: Changed lg:w-[280px] to lg:w-[360px]
    <aside className="w-full lg:w-[360px] flex-shrink-0 flex flex-col justify-between space-y-8 bg-[#c8d9e6]/40 border-r border-slate-200/60 p-6 lg:h-screen lg:sticky lg:top-0 overflow-y-auto">
      
      <div className="space-y-8">
        
        {/* ================= BRAND LOGO HEADER ================= */}
        {/* Increased padding slightly to match the wider sidebar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-2">
          
          {/* LOGO IMAGE */}
          <div className="flex items-center justify-center w-full min-h-[48px]">
            <Link href="/dashboard" className="relative w-full h-12 flex items-center justify-start">
              <Image 
                src="/logo.png" 
                alt="Nandgate IT Logo"
                width={220}     // Increased width to fit the wider sidebar
                height={48}     // Increased height slightly
                className="object-contain object-left" 
                priority 
              />
            </Link>
          </div>
          
        </div>

        {/* Navigation Menu */}
        {/* INCREASED SPACE: Changed space-y-2 to space-y-3 for more gap between items */}
        <nav className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                // INCREASED PADDING: Changed py-3.5 to py-4 for taller nav buttons
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#7BBDE8] text-white shadow-md shadow-[#7BBDE8]/25'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                {/* INCREASED GAP: Changed gap-3.5 to gap-4 between icon and text */}
                <div className="flex items-center gap-4">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-400'}`} />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Punch Desk Widget
      <div className="bg-gradient-to-b from-[#7BBDE8] to-[#5aa7d9] rounded-3xl p-6 text-white shadow-lg shadow-[#7BBDE8]/20 relative overflow-hidden mt-auto">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-medium text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Live Shift
          </span>
        </div>
        
        <h4 className="font-bold text-base tracking-tight mb-1">Quick Punch Desk</h4>
        <p className="text-white/80 text-xs leading-relaxed mb-5">
          Instant terminal sync for office attendance &amp; shifts
        </p>
        <button className="w-full bg-white text-slate-800 hover:bg-slate-50 font-bold text-xs py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2">
          <Fingerprint className="w-4 h-4 text-[#7BBDE8]" />
          Clock In / Out
        </button>
      </div> */}

    </aside>
  );
}