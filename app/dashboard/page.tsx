'use client';
import React, { useState } from 'react';
import {
  Search,
  Mic,
  Bell,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Clock,
  Users,
  Settings,
  Calendar,
  UserCheck
} from 'lucide-react';
import Sidebar from '../components/SideBar.';

export default function NandgateDashboard() {
  const [timeFilter, setTimeFilter] = useState('Last Week');

  return (
    // FULL SCREEN: min-h-screen, w-full, no outer padding/margins.
    // Background color is applied to the whole screen.
    <div className="min-h-screen w-full bg-[#f0f6fa] font-sans antialiased text-slate-800 selection:bg-[#7BBDE8]/30 flex">
      
      {/* ===================== SIDEBAR COMPONENT ===================== */}
    <Sidebar />
      {/* ===================== MAIN CONTENT ===================== */}
      {/* Main content takes remaining space, with generous padding */}
      <main className="flex-1 p-8 lg:p-10 flex flex-col space-y-8 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, shift, report..."
              className="w-full pl-14 pr-14 py-4 bg-white rounded-2xl text-base text-slate-700 placeholder-slate-400 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 focus:border-transparent"
            />
            <button className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
              <Users className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            
            {/* User Profile Capsule */}
            <div className="flex items-center gap-3 pl-4 py-1.5 pr-1.5 bg-white border border-slate-200/80 rounded-full shadow-sm">
              <span className="text-sm font-semibold text-slate-700">admin@nandgate.com</span>
              <div className="w-9 h-9 rounded-full bg-[#7BBDE8] text-white font-bold text-sm flex items-center justify-center">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Title & Period Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Good Morning, <span className="text-[#3b82f6]">Admin</span>
            </h1>
            <p className="text-base text-slate-500 mt-2">
              Welcome back to NANDGATE-IT workforce management overview.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200/80 rounded-full text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 self-start sm:self-auto">
            {timeFilter}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Top 2 Primary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Total Employees */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between mb-8">
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl lg:text-6xl font-black text-slate-900">45</span>
                  <span className="text-base font-semibold text-slate-500">Total Employees</span>
                </div>
                <span className="text-sm font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-4 py-1.5 rounded-full">
                  +4 onboarded
                </span>
              </div>
              
              {/* Avatars with Names */}
              <div className="flex items-center gap-5 my-4">
                <div className="flex -space-x-3">
                  <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 border-2 border-white text-sm font-bold flex items-center justify-center shadow-sm">Br</div>
                  <div className="w-12 h-12 rounded-full bg-emerald-400 text-slate-900 border-2 border-white text-sm font-bold flex items-center justify-center shadow-sm">Da</div>
                  <div className="w-12 h-12 rounded-full bg-rose-400 text-white border-2 border-white text-sm font-bold flex items-center justify-center shadow-sm">Em</div>
                  <div className="w-12 h-12 rounded-full bg-[#7BBDE8] text-white border-2 border-white text-sm font-bold flex items-center justify-center shadow-sm">Ja</div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 border-2 border-white text-sm font-bold flex items-center justify-center shadow-sm">+41</div>
                </div>
                <span className="text-base text-slate-500 font-medium">
                  Brendon, Daniel, Emily, ...
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-slate-50 text-base font-bold mt-4">
              <button className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                See All <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-emerald-700 bg-emerald-100/70 px-4 py-1.5 rounded-full text-sm">
                100% Active
              </span>
            </div>
          </div>

          {/* Card 2: Total Hours Worked */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-[#7BBDE8]">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                      1,840.5 <span className="text-3xl font-bold">hrs</span>
                    </div>
                    <div className="text-base font-semibold text-slate-500 mt-2">
                      Total Hours Worked (All Employees)
                    </div>
                  </div>
                </div>
                <HelpCircle className="w-6 h-6 text-slate-300" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-slate-50 text-base font-bold mt-8">
              <button className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                See All <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-emerald-700 bg-emerald-100/70 px-4 py-1.5 rounded-full text-sm">
                100% Verified
              </span>
            </div>
          </div>
        </div>

        {/* Middle Row: Charts & Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Chart: Attendance & Shift Activity (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-xl text-slate-900">Attendance &amp; Shift Activity</h3>
                <p className="text-sm text-slate-400 mt-1">Oct 2026</p>
              </div>
              <HelpCircle className="w-6 h-6 text-slate-300" />
            </div>
            
            {/* Line Chart Graphic */}
            <div className="relative h-72 lg:h-80 w-full flex items-end flex-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="50" x2="700" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="100" x2="700" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="150" x2="700" y2="150" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="280" y1="30" x2="280" y2="180" stroke="#cbd5e1" strokeDasharray="3 3" />
                
                <path d="M 20 160 Q 120 120 180 90 T 280 40 T 380 95 T 480 160 T 580 150 T 680 125" fill="none" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />
                <path d="M 20 170 Q 140 130 240 100 T 360 85 T 480 130 T 580 135 T 680 90" fill="none" stroke="#84cc16" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="280" cy="88" r="6" fill="#ffffff" stroke="#0284c7" strokeWidth="3" />
              </svg>
              
              <div className="absolute left-[36%] top-4 -translate-x-1/2 bg-[#0284c7] text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                38 Present
              </div>
            </div>
            
            <div className="flex justify-between text-sm font-semibold text-slate-400 mt-6 px-4">
              <span>12 Oct</span>
              <span>13 Oct</span>
              <span className="text-slate-800 font-bold">14 Oct</span>
              <span>15 Oct</span>
              <span>16 Oct</span>
              <span>17 Oct</span>
              <span>18 Oct</span>
            </div>
          </div>

          {/* Donut Chart (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-xl text-slate-900">Workforce Status</h3>
                <p className="text-sm text-slate-400 mt-1">Live Punch Distribution</p>
              </div>
              <HelpCircle className="w-6 h-6 text-slate-300" />
            </div>
            
            <div className="relative flex items-center justify-center my-8 flex-1">
              <svg className="w-48 h-48 lg:w-56 lg:h-56 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle cx="50" cy="50" r="38" stroke="#7BBDE8" strokeWidth="12" strokeDasharray="160 240" strokeDashoffset="0" fill="none" />
                <circle cx="50" cy="50" r="38" stroke="#fb923c" strokeWidth="12" strokeDasharray="30 240" strokeDashoffset="-160" fill="none" />
                <circle cx="50" cy="50" r="38" stroke="#f43f5e" strokeWidth="12" strokeDasharray="25 240" strokeDashoffset="-190" fill="none" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-sm font-bold text-white bg-emerald-700 px-4 py-1.5 rounded-full shadow-sm">
                  1.8k+ hrs
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm text-slate-600 font-medium pt-4">
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-[#7BBDE8]"></span>On Time</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>Overtime</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-orange-400"></span>Late In</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-sky-400"></span>On Leave</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-rose-500"></span>Absent</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-slate-300"></span>Other</div>
            </div>
          </div>
        </div>

        {/* Bottom 4 Operational Metric Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pb-4">
          
          {/* Box 1 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-[#7BBDE8]">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-4xl font-black text-slate-900">0</span>
              </div>
              <h4 className="text-base font-bold text-slate-600">In Office Now</h4>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-400 pt-5 border-t border-slate-50 mt-5">
              <span className="text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md">+0%</span>
              <span>Cap: 45 desks</span>
            </div>
          </div>

          {/* Box 2 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-4xl font-black text-slate-900">0</span>
              </div>
              <h4 className="text-base font-bold text-slate-600">Not Yet In</h4>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-400 pt-5 border-t border-slate-50 mt-5">
              <span className="text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md">- 30m</span>
              <span>Grace period</span>
            </div>
          </div>

          {/* Box 3 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-4xl font-black text-slate-900">0</span>
              </div>
              <h4 className="text-base font-bold text-slate-600">On Leave</h4>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-400 pt-5 border-t border-slate-50 mt-5">
              <span className="font-bold text-slate-700">1 Req</span>
              <span>Pending PTO</span>
            </div>
          </div>

          {/* Box 4 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-rose-100 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="text-4xl font-black text-slate-900">13</span>
              </div>
              <h4 className="text-base font-bold text-slate-600">Absent (Flagged)</h4>
            </div>
            <div className="pt-5 border-t border-slate-50 mt-5 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase bg-rose-600 text-white px-3 py-1.5 rounded-lg">
                Action
              </span>
              <span className="text-sm font-bold text-rose-500">
                100% Unexcused
              </span>
            </div>
            
            <div className="absolute right-4 -bottom-2 translate-y-1/2">
              <span className="bg-[#7BBDE8] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                +13 live alerts
              </span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}