"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  HelpCircle,
  AlertCircle,
  Clock,
  Calendar,
  UserCheck,
  RefreshCw,
  X,
  ArrowUpRight,
  Megaphone,
} from "lucide-react";
import { performLogout } from "../store/auth/authSlice";
import type { AppDispatch, RootState } from "../store/store";
import {
  fetchDashboard as fetchDashboardRequest,
  type DashboardEmployee,
  type DashboardPeriod,
} from "../store/dashboard/dashboardSlice";
import TeamAbsenceCalendar from "../components/TeamAbsenceCalendar";
import AnnouncementModal from "./AnnouncementModal";

// 14 DIFFERENT AVATAR COLORS
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-600",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-600",
  "bg-amber-600",
  "bg-violet-500",
  "bg-lime-600",
  "bg-sky-600",
  "bg-fuchsia-500",
];

// THEME COLOURS
const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

function formatDate(dateString: string, period: DashboardPeriod): string {
  const date = new Date(`${dateString}T00:00:00`);

  if (period === "day") {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (period === "month") {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
  });
}

function getInitials(name?: string): string {
  return name?.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
    : "?";
}

/* ---------------- design pieces ---------------- */

function AttendanceProgress({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center"
      role="progressbar"
      aria-label="Attendance today"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safe}
    >
      <svg
        viewBox="0 0 112 112"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#e8f1f9"
          strokeWidth="10"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={SKY}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </svg>
      <UserCheck className="h-8 w-8 text-[#1b64da]" aria-hidden="true" />
    </div>
  );
}

function CountBubble({
  value,
  color,
  text = INK,
}: {
  value: number;
  color: string;
  text?: string;
}) {
  const size = Math.min(78, Math.max(46, Math.round(34 + value * 4)));
  const fs = size >= 60 ? "text-lg" : "text-sm";

  return (
    <span
      className={`flex items-center justify-center rounded-full font-extrabold shadow-sm transition-transform duration-300 hover:scale-105 ${fs}`}
      style={{ width: size, height: size, backgroundColor: color, color: text }}
    >
      {value}
    </span>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

/* ---------------- main ---------------- */

export default function NandgateDashboard() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const {
    data: dashboard,
    loading,
    error,
  } = useSelector((state: RootState) => state.dashboard);
  const [timeFilter, setTimeFilter] = useState<DashboardPeriod>("week");
  const [announcementOpen, setAnnouncementOpen] = useState(false);

  // SEARCH STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<DashboardEmployee | null>(null);

  // FETCH DASHBOARD
  const fetchDashboard = useCallback(async () => {
    try {
      await dispatch(fetchDashboardRequest(timeFilter));
    } catch (error) {
      const unauthorized =
        typeof error === "object" &&
        error !== null &&
        "unauthorized" in error &&
        error.unauthorized === true;
      if (unauthorized) {
        dispatch(performLogout());
        router.push("/login");
      }
    }
  }, [dispatch, router, timeFilter]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchDashboard();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchDashboard]);

  // DASHBOARD DATA
  const counts = dashboard?.today.counts;
  const chartData = dashboard?.attendance_chart || [];
  const activeEmployees = dashboard?.active_employees || [];
  const totalEmployees = dashboard?.attendance_summary.total_employees || 0;
  const totalHours = dashboard?.attendance_summary.total_worked_hours || 0;

  // EMPLOYEE SEARCH
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return activeEmployees.filter((employee) => {
      return (
        employee.name?.toLowerCase().includes(query) ||
        employee.emp_code?.toLowerCase().includes(query) ||
        employee.designation?.toLowerCase().includes(query)
      );
    });
  }, [activeEmployees, searchQuery]);

  const isShiftSearch = searchQuery.trim().toLowerCase().includes("shift");
  const isReportSearch = searchQuery.trim().toLowerCase().includes("report");

  // CLEAR SEARCH
  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
    setSelectedEmployee(null);
  };

  // WORKFORCE DONUT DATA
  const donutItems = useMemo(() => {
    if (!counts) return [];

    return [
      { label: "In Office", value: counts.in, color: "#7BBDE8" },
      { label: "Out", value: counts.out, color: "#10b981" },
      { label: "On Leave", value: counts.on_leave, color: "#38bdf8" },
      { label: "Absent", value: counts.absent, color: "#f43f5e" },
      {
        label: "Other",
        value: counts.weekly_off + counts.insufficient + counts.no_punch_yet,
        color: "#cbd5e1",
      },
    ];
  }, [counts]);

  const donutTotal = donutItems.reduce((total, item) => total + item.value, 0);

  // CHART POINTS
  const chartPoints = useMemo(() => {
    if (!chartData.length) return [];

    const maxValue = Math.max(...chartData.map((item) => item.work_hours), 1);
    const width = 700;
    const height = 180;
    const horizontalPadding = 15;
    const verticalPadding = 15;

    return chartData.map((item, index) => {
      const x =
        chartData.length === 1
          ? width / 2
          : horizontalPadding +
            (index / (chartData.length - 1)) * (width - horizontalPadding * 2);

      const y =
        height -
        verticalPadding -
        (item.work_hours / maxValue) * (height - verticalPadding * 2);

      return { x, y, ...item };
    });
  }, [chartData]);

  const chartPath = useMemo(() => {
    if (!chartPoints.length) return "";
    return chartPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }, [chartPoints]);

  const chartAreaPath = useMemo(() => {
    if (!chartPoints.length) return "";
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${chartPath} L ${last.x} 190 L ${first.x} 190 Z`;
  }, [chartPath, chartPoints]);

  const periodLabel =
    timeFilter === "day"
      ? "Today"
      : timeFilter === "week"
        ? "Last 7 Days"
        : "Last 30 Days";

  // ---------- derived values ----------
  const totalCount = counts?.total_employees || totalEmployees || 0;
  const pctOf = (value: number) =>
    totalCount > 0 ? Math.round((value / totalCount) * 100) : 0;

  const presentToday = (counts?.in ?? 0) + (counts?.out ?? 0);
  const presentPct = pctOf(presentToday);

  const segments = [
    {
      key: "in",
      label: "In Office",
      count: counts?.in ?? 0,
      note: "Currently punched in",
      color: SKY,
      text: INK,
      bar: "bg-[#1b64da]",
      muted: "text-black/50",
      sample: dashboard?.today.employees.in?.[0],
      Icon: UserCheck,
    },
    {
      key: "wait",
      label: "Not Yet In",
      count: counts?.no_punch_yet ?? 0,
      note: "Awaiting first punch",
      color: SKY_LIGHT,
      text: INK,
      bar: "bg-[#1b64da]",
      muted: "text-black/50",
      sample: dashboard?.today.employees.no_punch_yet?.[0],
      Icon: Clock,
    },
    {
      key: "absent",
      label: "Absent",
      count: counts?.absent ?? 0,
      note: `${dashboard?.unregularized_days_this_month ?? 0} unregularized`,
      color: BLUE,
      text: "#ffffff",
      bar: "bg-white",
      muted: "text-white/70",
      sample: dashboard?.today.employees.absent?.[0],
      Icon: AlertCircle,
    },
  ];

  const detailCards = [
    {
      key: "leave",
      label: "On Leave",
      value: counts?.on_leave ?? 0,
      color: SKY_LIGHT,
      text: INK,
      muted: "text-black/50",
      Icon: Calendar,
    },
    {
      key: "out",
      label: "Checked Out",
      value: counts?.out ?? 0,
      color: SKY,
      text: INK,
      muted: "text-black/50",
      Icon: UserCheck,
    },
    {
      key: "late",
      label: "Late Arrivals",
      value: dashboard?.attendance_summary.late_count ?? 0,
      color: BLUE,
      text: "#ffffff",
      muted: "text-white/70",
      Icon: Clock,
    },
    {
      key: "insufficient",
      label: "Insufficient",
      value: counts?.insufficient ?? 0,
      color: SKY_LIGHT,
      text: INK,
      muted: "text-black/50",
      Icon: AlertCircle,
    },
    {
      key: "weekly",
      label: "Weekly Off",
      value: counts?.weekly_off ?? 0,
      color: SKY,
      text: INK,
      muted: "text-black/50",
      Icon: Calendar,
    },
    {
      key: "unreg",
      label: "Unregularized",
      value: dashboard?.unregularized_days_this_month ?? 0,
      color: BLUE,
      text: "#ffffff",
      muted: "text-white/70",
      Icon: AlertCircle,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans antialiased text-slate-800 selection:bg-[#7BBDE8]/30">
      {/* keyframes */}
      <style>{`
        @keyframes nandFadeUp { from { opacity:0; transform: translateY(14px);} to { opacity:1; transform: translateY(0);} }
        .nand-fade-up { animation: nandFadeUp .55s cubic-bezier(.22,.61,.36,1) both; }
        @keyframes nandDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        .nand-draw { animation: nandDraw 1.1s ease-out forwards; }
        @keyframes nandPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(27,100,218,.35); } 50% { box-shadow: 0 0 0 7px rgba(27,100,218,0); } }
        .nand-pulse { animation: nandPulse 2.2s ease-in-out infinite; }
      `}</style>

      <main className="flex-1 rounded-t-[40px] bg-[#f0f6fa]">
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-8 px-3 py-8 sm:px-5 lg:px-6 lg:py-10">
                
          {/* ================= GREETING + FILTERS ================= */}
          <div
            className="nand-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            style={{ animationDelay: "60ms" }}
          >
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                Good Morning, <span className="text-[#1b64da]">Admin</span>
              </h1>
              <p className="mt-2 text-base text-slate-500">
                Welcome back to NANDGATE-IT workforce management overview.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center">
                  {activeEmployees.slice(0, 5).map((employee, index) => (
                    <div
                      key={employee.id}
                      title={employee.name}
                      aria-label={employee.name}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-[#f0f6fa] ${
                        index > 0 ? "-ml-2" : ""
                      } ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                    >
                      {getInitials(employee.name)}
                    </div>
                  ))}
                  {activeEmployees.length > 5 && (
                    <div className="-ml-2 flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-slate-500 ring-2 ring-[#f0f6fa]">
                      +{activeEmployees.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-500">
                  {loading
                    ? "Loading employees…"
                    : `${totalEmployees} Total Employees`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/compensatory-days"
                className="inline-flex items-center gap-2 rounded-full border border-[#bfe0f5] bg-white px-5 py-3.5 text-sm font-bold text-[#1b64da] shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <Calendar className="h-5 w-5" aria-hidden="true" />
                Plan compensatory days
              </Link>
              <button
                type="button"
                onClick={() => setAnnouncementOpen(true)}
                className="announcement-float flex items-center gap-3 rounded-full border-2 border-white bg-[#1b64da] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <Megaphone className="h-5 w-5" aria-hidden="true" />
                Send announcement
              </button>
              <select
                value={timeFilter}
                onChange={(e) =>
                  setTimeFilter(e.target.value as DashboardPeriod)
                }
                className="cursor-pointer rounded-full border border-slate-200/80 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm outline-none transition-all hover:border-slate-300 focus:ring-2 focus:ring-[#7BBDE8]/50"
              >
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>

              <button
                type="button"
                onClick={fetchDashboard}
                disabled={loading}
                title="Refresh dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:text-blue-600 hover:shadow-md disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* ================= ERROR ================= */}
          {error && (
            <div className="nand-fade-up flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-500" />
                <div>
                  <p className="font-semibold text-rose-700">
                    Dashboard could not be loaded
                  </p>
                  <p className="mt-1 text-sm text-rose-600">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchDashboard}
                className="text-sm font-bold text-rose-700 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* ================= BREAKDOWN ================= */}
          <section className="nand-fade-up" style={{ animationDelay: "540ms" }}>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900">
                Attendance Breakdown
              </h2>
              </div>

            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {detailCards.map((card) => (
                <div
                  key={card.key}
                  className="flex flex-col rounded-[24px] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ backgroundColor: card.color, color: card.text }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold leading-tight">
                      {card.label}
                    </p>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/40">
                      <card.Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <p className="mt-3 text-3xl font-black leading-none">
                    {loading ? <Skeleton className="h-7 w-10" /> : card.value}
                  </p>

                  {/* <p className="mt-3 text-xs font-bold leading-snug">
                    {card.line}
                  </p> */}
                  {/* <p
                    className={`text-xs font-medium leading-snug ${card.muted}`}
                  >
                    {card.note}
                  </p> */}
                </div>
              ))}
            </div>
          </section>
          {/* ================= OPERATIONS AT A GLANCE ================= */}
          <section
            className="nand-rise grid overflow-hidden rounded-[28px] border border-[#d6e8f7] bg-white shadow-sm lg:grid-cols-12"
            style={{ animationDelay: "120ms" }}
          >
            <div className="relative flex flex-col justify-between gap-6 overflow-hidden bg-[#eaf4fc] p-6 sm:p-8 lg:col-span-4">
              <span className="absolute inset-y-0 left-0 w-1.5 bg-[#1b64da]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#1b64da]">
                  Attendance today
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black leading-none text-slate-900">
                      {loading ? (
                        <Skeleton className="h-12 w-24" />
                      ) : (
                        `${presentPct}%`
                      )}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      {counts?.in ?? 0} currently in office
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      of {totalCount} employees
                    </p>
                  </div>
                  <AttendanceProgress percent={presentPct} />
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 border-t border-[#cfe3f5] pt-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Hours worked
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none text-slate-900">
                    {loading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <>
                        {totalHours.toLocaleString("en-IN", {
                          maximumFractionDigits: 1,
                        })}
                        <span className="ml-1 text-sm font-bold text-slate-500">
                          hrs
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#1b64da] shadow-sm">
                  {periodLabel}
                </span>
              </div>
            </div>

            <div className="min-w-0 p-6 sm:p-8 lg:col-span-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live operations
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    Workforce status
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  {loading ? "Updating…" : `${totalCount} team members`}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
                {segments.map((segment, index) => {
                  const percentage = pctOf(segment.count);
                  return (
                    <div
                      key={segment.key}
                      className={`min-w-0 ${index > 0 ? "sm:border-l sm:border-slate-100 sm:pl-4" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f0f6fa] text-[#1b64da]"
                            aria-hidden="true"
                          >
                            <segment.Icon className="h-4 w-4" />
                          </span>
                          <span className="truncate text-xs font-bold text-slate-600">
                            {segment.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                          {loading ? "—" : `${percentage}%`}
                        </span>
                      </div>

                      <p className="mt-4 text-3xl font-black leading-none text-slate-900">
                        {loading ? (
                          <Skeleton className="h-8 w-12" />
                        ) : (
                          segment.count
                        )}
                      </p>
                      <div
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-label={`${segment.label} share of workforce`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentage}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: segment.color,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs leading-snug text-slate-400">
                        {segment.note}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="nand-pulse h-2 w-2 rounded-full bg-emerald-500" />
                  Live attendance snapshot
                </div>
                <div className="flex items-center gap-1.5">
                  {activeEmployees.slice(0, 6).map((employee, index) => (
                    <span
                      key={employee.id}
                      title={employee.name}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                    >
                      {getInitials(employee.name)}
                    </span>
                  ))}
                  {activeEmployees.length > 6 && (
                    <span className="ml-1 text-xs font-semibold text-slate-400">
                      +{activeEmployees.length - 6}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
          <TeamAbsenceCalendar />
          {/* ================= CHARTS ================= */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Line chart */}
            <div
              className="nand-fade-up flex flex-col rounded-[28px] border border-[#e6edf4] bg-white p-6 shadow-sm sm:p-8 lg:col-span-8"
              style={{ animationDelay: "420ms" }}
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Attendance &amp; Shift Activity
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {periodLabel} attendance activity
                  </p>
                </div>
                <HelpCircle className="h-6 w-6 shrink-0 text-slate-300" />
              </div>

              <div className="relative flex h-72 w-full flex-1 items-end lg:h-80">
                {chartData.length > 0 ? (
                  <svg
                    className="h-full w-full overflow-visible"
                    viewBox="0 0 700 200"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="blueGrad"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#38bdf8"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#38bdf8"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    {[50, 100, 150].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="700"
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}

                    <path
                      key={`area-${timeFilter}`}
                      d={chartAreaPath}
                      fill="url(#blueGrad)"
                      className="nand-fade-up"
                    />

                    <path
                      key={`line-${timeFilter}`}
                      d={chartPath}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray="1"
                      strokeDashoffset="1"
                      className="nand-draw"
                    />

                    {chartPoints.map((point, index) => (
                      <circle
                        key={`${point.date}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#ffffff"
                        stroke="#0284c7"
                        strokeWidth="3"
                        className="nand-fade-up"
                        style={{ animationDelay: `${600 + index * 60}ms` }}
                      >
                        <title>
                          {formatDate(point.date, timeFilter)}:{" "}
                          {point.work_hours} hours
                        </title>
                      </circle>
                    ))}
                  </svg>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    {loading
                      ? "Loading attendance chart…"
                      : "No attendance data for this period."}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-between gap-2 px-1 text-xs font-semibold text-slate-400 sm:text-sm">
                {chartData.length > 0 &&
                  chartData
                    .filter((_, index) => {
                      const step = Math.max(1, Math.ceil(chartData.length / 7));
                      return (
                        index % step === 0 || index === chartData.length - 1
                      );
                    })
                    .map((item) => (
                      <span key={item.date}>
                        {formatDate(item.date, timeFilter)}
                      </span>
                    ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-sky-600" /> Working
                  Hours
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-400" /> Late
                  Count: {dashboard?.attendance_summary.late_count ?? 0}
                </div>
              </div>
            </div>

            {/* Donut */}
            <div
              className="nand-fade-up flex flex-col justify-between rounded-[28px] border border-[#e6edf4] bg-white p-6 shadow-sm sm:p-8 lg:col-span-4"
              style={{ animationDelay: "480ms" }}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Workforce Status
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Live Punch Distribution
                  </p>
                </div>
                <HelpCircle className="h-6 w-6 shrink-0 text-slate-300" />
              </div>

              <div className="relative my-6 flex flex-1 items-center justify-center">
                <svg
                  className="h-48 w-48 -rotate-90 lg:h-52 lg:w-52"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                    fill="none"
                  />
                  {donutTotal > 0 &&
                    (() => {
                      const circumference = 2 * Math.PI * 38;
                      let offset = 0;
                      return donutItems.map((item) => {
                        const segmentLength =
                          (item.value / donutTotal) * circumference;
                        const circle = (
                          <circle
                            key={item.label}
                            cx="50"
                            cy="50"
                            r="38"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                            strokeDashoffset={-offset}
                            fill="none"
                            style={{
                              transition: "stroke-dasharray 700ms ease",
                            }}
                          />
                        );
                        offset += segmentLength;
                        return circle;
                      });
                    })()}
                </svg>

                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-900">
                    {loading ? <Skeleton className="h-8 w-12" /> : donutTotal}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    Employees
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-xs font-medium text-slate-600 sm:grid-cols-2">
                {donutItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">
                      {item.label}{" "}
                      <span className="font-bold text-slate-800">
                        ({item.value})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ================= PENDING + DEVICES ================= */}
          <div className="grid grid-cols-1 gap-6 pb-6 md:grid-cols-2">
            {/* Pending Requests */}
            <div
              className="nand-fade-up rounded-[28px] border border-[#e6edf4] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md"
              style={{ animationDelay: "600ms" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Pending Requests
                </h3>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
                  {dashboard?.pending_requests.total ?? 0} Total
                </span>
              </div>

              <div className="grid grid-cols-3 items-end gap-4 py-2">
                {[
                  {
                    label: "Leave",
                    value: dashboard?.pending_requests.leave ?? 0,
                    color: BLUE,
                    text: "#ffffff",
                  },
                  {
                    label: "Permission",
                    value: dashboard?.pending_requests.permission ?? 0,
                    color: SKY,
                    text: INK,
                  },
                  {
                    label: "Regularization",
                    value: dashboard?.pending_requests.regularization ?? 0,
                    color: SKY_LIGHT,
                    text: INK,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-3"
                  >
                    <CountBubble
                      value={item.value}
                      color={item.color}
                      text={item.text}
                    />
                    <span className="text-center text-xs font-semibold text-slate-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Health */}
            <div
              className="nand-fade-up rounded-[28px] border border-[#e6edf4] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md"
              style={{ animationDelay: "660ms" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Device Health
                </h3>
                <ArrowUpRight className="h-5 w-5 text-slate-300" />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-400">Total</p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {dashboard?.devices.total ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-600">Online</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {dashboard?.devices.ok ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4">
                  <p className="text-xs font-medium text-rose-500">Alert</p>
                  <p className="mt-1 text-2xl font-bold text-rose-600">
                    {dashboard?.devices.alert ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-400">Inactive</p>
                  <p className="mt-1 text-2xl font-bold text-slate-500">
                    {dashboard?.devices.inactive ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {announcementOpen && <AnnouncementModal onClose={() => setAnnouncementOpen(false)} />}
    </div>
  );
}
