
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, ChevronDown } from "lucide-react";

interface HeaderProps {
  userInitials?: string;
  unreadNotifications?: boolean;
  onSearchChange?: (query: string) => void;
}

export default function Header({
  userInitials = "AD",
  unreadNotifications = true,
  onSearchChange,
}: HeaderProps) {

  // Get current route
  const pathname = usePathname();

  // Hide header only on Dashboard
  if (pathname === "/dashboard" || pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xl border-b border-[#d6e5fb] shadow-sm">

      {/* Top Accent */}
      <div className="h-[3px] bg-gradient-to-r from-[#0047BA] via-[#38A9F5] to-[#7BBDE8]" />

      <div className="min-h-[76px] px-4 md:px-8 flex items-center justify-between gap-4">

        {/* LEFT - GEOMETRIC DESIGN */}
        <div className="relative flex items-center flex-1 min-w-0 h-12 overflow-hidden">

          <div className="relative w-[280px] sm:w-[400px] h-12 shrink-0">

            {/* Main White Geometric Plate */}
            <div className="absolute left-[55px] top-[11px] w-[260px] h-[29px] bg-[#E5ECF5] -skew-x-[25deg]" />

            {/* Cyan Under Ribbon */}
            <div className="absolute left-[28px] top-[24px] w-[185px] h-[12px] bg-[#38A9F5] -skew-x-[25deg]" />

            {/* Royal Blue Accent */}
            <div className="absolute left-[14px] top-[8px] w-[11px] h-[38px] bg-[#0047BA] -skew-x-[25deg]" />

            {/* Sky Blue Accent */}
            <div className="absolute left-[35px] top-[4px] w-[10px] h-[44px] bg-[#7BBDE8] -skew-x-[25deg]" />

            {/* Secondary Blue Ribbon */}
            <div className="absolute left-[245px] top-[5px] w-[65px] h-[17px] bg-[#38A9F5] -skew-x-[25deg]" />

            {/* Small Geometric Stripes */}
            <div className="absolute left-[330px] top-[12px] flex gap-2">
              <span className="w-2 h-8 bg-[#38A9F5] -skew-x-[25deg]" />
              <span className="w-2 h-8 bg-[#0047BA] -skew-x-[25deg]" />
              <span className="w-2 h-8 bg-[#7BBDE8] -skew-x-[25deg]" />
            </div>

            {/* Thin Accent Lines */}
            <div className="absolute left-[115px] top-[3px] w-24 h-[2px] bg-[#38A9F5]" />
            <div className="absolute left-[190px] bottom-[1px] w-20 h-[2px] bg-[#7BBDE8]" />

          </div>
        </div>

        {/* RIGHT - SEARCH, NOTIFICATIONS AND PROFILE */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">

          {/* Search */}
          <div className="relative hidden md:block w-52 lg:w-72 group">

            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7BBDE8] group-focus-within:text-[#0047BA]" />

            <input
              type="text"
              placeholder="Search requests, employee ID..."
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5fb] text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-[#38A9F5] focus:ring-4 focus:ring-[#38A9F5]/10"
            />

          </div>

          {/* Notifications */}
          <button
            type="button"
            aria-label="View notifications"
            className="relative w-10 h-10 rounded-xl border border-[#d6e5fb] bg-white flex items-center justify-center text-slate-500 hover:bg-[#f0f7ff] hover:text-[#0047BA] transition-all"
          >
            <Bell className="w-[18px] h-[18px]" />

            {unreadNotifications && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}

          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#d6e5fb]">

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0047BA] to-[#38A9F5] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userInitials}
            </div>

            <div className="hidden lg:block">
              <p className="text-xs font-bold text-[#17365D]">
                Administrator
              </p>
              <p className="text-[10px] text-slate-400">
                System Account
              </p>
            </div>

            <ChevronDown className="hidden lg:block w-4 h-4 text-slate-400" />

          </div>

        </div>

      </div>
    </header>
  );
}
