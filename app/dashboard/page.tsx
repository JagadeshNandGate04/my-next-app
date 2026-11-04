'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import {
  Search,
  HelpCircle,
  AlertCircle,
  Clock,
  Calendar,
  UserCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { performLogout } from '../store/auth/authSlice';
import type { AppDispatch } from '../store/store';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.88:5001';

const DASHBOARD_API = `${API_BASE}/api/v1/admin/dashboard`;

type Period = 'day' | 'week' | 'month';

interface Employee {
  id: string | number;
  emp_code: string;
  name: string;
  designation?: string;
  work_min?: number;
  is_late?: boolean;
  first_in?: string | null;
  last_out?: string | null;
  last_punch_at?: string;
  attendance_status?: string;
}

interface ChartItem {
  date: string;
  work_minutes: number;
  work_hours: number;
  employees_worked: number;
  late_count: number;
  absent_count: number;
}

interface DashboardData {
  date: string;
  period: Period;

  attendance_summary: {
    total_employees: number;
    total_work_minutes: number;
    total_worked_hours: number;
    late_count: number;
  };

  active_employees: Employee[];

  attendance_chart: ChartItem[];

  today: {
    counts: {
      in: number;
      out: number;
      absent: number;
      on_leave: number;
      weekly_off: number;
      insufficient: number;
      no_punch_yet: number;
      total_employees: number;
    };

    employees: {
      in: Employee[];
      out: Employee[];
      absent: Employee[];
      on_leave: Employee[];
      weekly_off: Employee[];
      insufficient: Employee[];
      no_punch_yet: Employee[];
    };
  };

  pending_requests: {
    leave: number;
    permission: number;
    regularization: number;
    total: number;
  };

  devices: {
    total: number;
    ok: number;
    alert: number;
    inactive: number;
  };

  unregularized_days_this_month: number;
}

interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}

// 14 DIFFERENT AVATAR COLORS
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-600',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-600',
  'bg-amber-600',
  'bg-violet-500',
  'bg-lime-600',
  'bg-sky-600',
  'bg-fuchsia-500',
];

// THEME COLOURS (same family as the sidebar #7BBDE8)
const SKY = '#7BBDE8';
const SKY_LIGHT = '#bfe0f5';
const BLUE = '#1b64da';
const INK = '#0f172a';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const storedAuth = localStorage.getItem('attendance-auth');

    if (!storedAuth) {
      return localStorage.getItem('token');
    }

    const parsed = JSON.parse(storedAuth);

    return (
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.data?.token ||
      parsed?.auth?.token ||
      localStorage.getItem('token') ||
      null
    );
  } catch {
    return localStorage.getItem('token');
  }
}

function formatDate(dateString: string, period: Period): string {
  const date = new Date(`${dateString}T00:00:00`);

  if (period === 'day') {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  if (period === 'month') {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
  });
}

// ---------- display-only helpers for the new design ----------

function getInitials(name?: string): string {
  return name?.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
    : '?';
}

// ---------- design pieces ----------

function AttendanceProgress({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative flex h-[112px] w-[112px] items-center justify-center"
      role="progressbar"
      aria-label="Attendance today"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safe}
    >
      <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#dcebf7"
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
        />
      </svg>
      <UserCheck className="h-10 w-10 text-[#1b64da]" aria-hidden="true" />
    </div>
  );
}

const bubbles: [number, number, number, string][] = [
  [53, 40, 17, '#7BBDE8'],
  [17, 79, 14, '#a9d6f2'],
  [14, 29, 12, '#8cc8ec'],
  [40, 66, 9, '#1b64da'],
  [100, 46, 11, '#3b82e8'],
  [80, 63, 8, '#bfe0f5'],
  [58, 91, 8, '#bfe0f5'],
  [44, 96, 7, '#d7ebf9'],
  [72, 79, 6, '#5aa6e3'],
  [32, 14, 7, '#6fb5e6'],
  [50, 9, 5, '#9cd0f0'],
  [67, 8, 5, '#c8e4f6'],
  [82, 16, 6, '#86c2ea'],
  [93, 25, 5, '#b5daf3'],
  [74, 36, 4, '#bfe0f5'],
  [86, 55, 5, '#2f78e6'],
  [62, 58, 4, '#0a47b3'],
  [32, 48, 5, '#74b9e8'],
  [27, 66, 4, '#68b0e4'],
  [96, 70, 4, '#a3cff0'],
];

function BubbleCluster() {
  return (
    <svg viewBox="0 0 116 108" className="h-[108px] w-[116px]" aria-hidden="true">
      {bubbles.map(([cx, cy, r, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
    </svg>
  );
}

// circle that grows with its value
function CountBubble({
  value,
  color,
  text = INK,
}: {
  value: number;
  color: string;
  text?: string;
}) {
  const size = Math.min(84, Math.round(30 + value * 3));
  const fs = size >= 56 ? 'text-lg' : 'text-sm';

  return (
    <span
      className={`flex items-center justify-center rounded-full font-extrabold ${fs}`}
      style={{ width: size, height: size, backgroundColor: color, color: text }}
    >
      {value}
    </span>
  );
}

export default function NandgateDashboard() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [timeFilter, setTimeFilter] = useState<Period>('week');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SEARCH STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  // FETCH DASHBOARD
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = getAuthToken();

      if (!token) {
        dispatch(performLogout());
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${DASHBOARD_API}?period=${timeFilter}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (response.status === 401) {
        dispatch(performLogout());
        router.push('/login');
        return;
      }

      const result: DashboardResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to fetch dashboard data.'
        );
      }

      setDashboard(result.data);
    } catch (err) {
      console.error('Dashboard API error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while fetching dashboard data.'
      );
    } finally {
      setLoading(false);
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

  const totalEmployees =
    dashboard?.attendance_summary.total_employees || 0;

  const totalHours =
    dashboard?.attendance_summary.total_worked_hours || 0;

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

  const isShiftSearch = searchQuery
    .trim()
    .toLowerCase()
    .includes('shift');

  const isReportSearch = searchQuery
    .trim()
    .toLowerCase()
    .includes('report');

  // CLEAR SEARCH
  const clearSearch = () => {
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedEmployee(null);
  };

  // WORKFORCE DONUT DATA
  // Late arrivals are excluded because they overlap with IN/OUT counts.
  const donutItems = useMemo(() => {
    if (!counts) return [];

    return [
      { label: 'In Office', value: counts.in, color: '#7BBDE8' },
      { label: 'Out', value: counts.out, color: '#10b981' },
      { label: 'On Leave', value: counts.on_leave, color: '#38bdf8' },
      { label: 'Absent', value: counts.absent, color: '#f43f5e' },
      {
        label: 'Other',
        value:
          counts.weekly_off +
          counts.insufficient +
          counts.no_punch_yet,
        color: '#cbd5e1',
      },
    ];
  }, [counts]);

  const donutTotal = donutItems.reduce(
    (total, item) => total + item.value,
    0
  );

  // CHART POINTS
  const chartPoints = useMemo(() => {
    if (!chartData.length) return [];

    const maxValue = Math.max(
      ...chartData.map((item) => item.work_hours),
      1
    );

    const width = 700;
    const height = 180;
    const horizontalPadding = 15;
    const verticalPadding = 15;

    return chartData.map((item, index) => {
      const x =
        chartData.length === 1
          ? width / 2
          : horizontalPadding +
            (index / (chartData.length - 1)) *
              (width - horizontalPadding * 2);

      const y =
        height -
        verticalPadding -
        (item.work_hours / maxValue) *
          (height - verticalPadding * 2);

      return { x, y, ...item };
    });
  }, [chartData]);

  const chartPath = useMemo(() => {
    if (!chartPoints.length) return '';

    return chartPoints
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      )
      .join(' ');
  }, [chartPoints]);

  const chartAreaPath = useMemo(() => {
    if (!chartPoints.length) return '';

    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];

    return `${chartPath} L ${last.x} 190 L ${first.x} 190 Z`;
  }, [chartPath, chartPoints]);

  const periodLabel =
    timeFilter === 'day'
      ? 'Today'
      : timeFilter === 'week'
        ? 'Last 7 Days'
        : 'Last 30 Days';

  const filterLabel =
    timeFilter === 'day'
      ? 'Last Day'
      : timeFilter === 'week'
        ? 'Last Week'
        : 'Last Month';

  // ---------- derived values for the new design (no extra API calls) ----------
  const totalCount = counts?.total_employees || totalEmployees || 0;

  const pctOf = (value: number) =>
    totalCount > 0 ? Math.round((value / totalCount) * 100) : 0;

  const presentToday = (counts?.in ?? 0) + (counts?.out ?? 0);
  const presentPct = pctOf(presentToday);

  const segments = [
    {
      key: 'in',
      label: 'In Office',
      count: counts?.in ?? 0,
      note: 'Currently IN',
      color: SKY,
      text: INK,
      muted: 'text-black/40',
      sample: dashboard?.today.employees.in?.[0],
      Icon: UserCheck,
    },
    {
      key: 'wait',
      label: 'Not Yet In',
      count: counts?.no_punch_yet ?? 0,
      note: 'Awaiting punch',
      color: SKY_LIGHT,
      text: INK,
      muted: 'text-black/40',
      sample: dashboard?.today.employees.no_punch_yet?.[0],
      Icon: Clock,
    },
    {
      key: 'absent',
      label: 'Absent',
      count: counts?.absent ?? 0,
      note: `${dashboard?.unregularized_days_this_month ?? 0} unregularized`,
      color: BLUE,
      text: '#ffffff',
      muted: 'text-white/60',
      sample: dashboard?.today.employees.absent?.[0],
      Icon: AlertCircle,
    },
  ];

  // Cards for details NOT already shown in the three coloured cards above
  const detailCards = [
    {
      key: 'leave',
      label: 'On Leave',
      value: counts?.on_leave ?? 0,
      line: `${pctOf(counts?.on_leave ?? 0)}% of workforce`,
      note: `${dashboard?.pending_requests.leave ?? 0} pending leave requests`,
      color: SKY_LIGHT,
      text: INK,
      muted: 'text-black/40',
      Icon: Calendar,
    },
    {
      key: 'out',
      label: 'Checked Out',
      value: counts?.out ?? 0,
      line: `${pctOf(counts?.out ?? 0)}% of workforce`,
      note: 'Left for the day',
      color: SKY,
      text: INK,
      muted: 'text-black/40',
      Icon: UserCheck,
    },
    {
      key: 'late',
      label: 'Late Arrivals',
      value: dashboard?.attendance_summary.late_count ?? 0,
      line: periodLabel,
      note: 'Late punch-ins',
      color: BLUE,
      text: '#ffffff',
      muted: 'text-white/60',
      Icon: Clock,
    },
    {
      key: 'insufficient',
      label: 'Insufficient',
      value: counts?.insufficient ?? 0,
      line: `${pctOf(counts?.insufficient ?? 0)}% of workforce`,
      note: 'Short working hours',
      color: SKY_LIGHT,
      text: INK,
      muted: 'text-black/40',
      Icon: AlertCircle,
    },
    {
      key: 'weekly',
      label: 'Weekly Off',
      value: counts?.weekly_off ?? 0,
      line: `${pctOf(counts?.weekly_off ?? 0)}% of workforce`,
      note: 'Scheduled day off',
      color: SKY,
      text: INK,
      muted: 'text-black/40',
      Icon: Calendar,
    },
    {
      key: 'unreg',
      label: 'Unregularized',
      value: dashboard?.unregularized_days_this_month ?? 0,
      line: 'This month',
      note: 'Days needing action',
      color: BLUE,
      text: '#ffffff',
      muted: 'text-white/60',
      Icon: AlertCircle,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-white font-sans antialiased text-slate-800 selection:bg-[#7BBDE8]/30 flex flex-col">
      <main className="flex-1 rounded-t-[40px] bg-[#f0f6fa]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col space-y-8 px-5 py-8 lg:px-10 lg:py-10">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">

          {/* FUNCTIONAL SEARCH */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2 z-10" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
                setSelectedEmployee(null);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                }
              }}
              placeholder="Search employee, shift, report..."
              autoComplete="off"
              className="w-full pl-14 pr-12 py-4 bg-white rounded-full text-base text-slate-700 placeholder-slate-400 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                title="Clear search"
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* SEARCH RESULTS DROPDOWN */}
            {searchOpen && searchQuery.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">

                {/* EMPLOYEE RESULTS */}
                {filteredEmployees.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
                      Employees ({filteredEmployees.length})
                    </p>

                    <div className="max-h-64 overflow-y-auto">
                      {filteredEmployees.map((employee, index) => (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setSearchOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-sky-50 transition-colors"
                        >
                          <div
                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              AVATAR_COLORS[index % AVATAR_COLORS.length]
                            }`}
                          >
                            {getInitials(employee.name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {employee.name}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              {employee.emp_code}
                              {employee.designation
                                ? ` • ${employee.designation}`
                                : ''}
                            </p>
                          </div>

                          <span className="text-xs text-blue-500 font-semibold">
                            View
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SHIFT MESSAGE */}
                {isShiftSearch && (
                  <div className="p-4 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-500 mt-0.5" />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Shift Management
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          The shift management page has not been created yet.
                          It can be added when the shift feature is ready.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* REPORT MESSAGE */}
                {isReportSearch && (
                  <div className="p-4 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Reports
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          The reports page has not been created yet.
                          It can be added when the reports feature is ready.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* NO EMPLOYEE RESULTS */}
                {!isShiftSearch &&
                  !isReportSearch &&
                  filteredEmployees.length === 0 && (
                    <div className="p-5 text-center">
                      <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />

                      <p className="text-sm font-semibold text-slate-700">
                        No matching employees found
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Try searching by employee name, code, or designation.
                      </p>
                    </div>
                  )}

                {/* CLEAR SEARCH */}
                <div className="border-t border-slate-100 p-2">
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 py-2"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}

            {/* SELECTED EMPLOYEE DETAILS */}
            {selectedEmployee && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-800">
                    Employee Details
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-500"
                  >
                    Close
                  </button>
                </div>

                <p className="text-base font-bold text-slate-900">
                  {selectedEmployee.name}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Employee Code: {selectedEmployee.emp_code}
                </p>

                {selectedEmployee.designation && (
                  <p className="text-sm text-slate-500 mt-1">
                    Designation: {selectedEmployee.designation}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* WELCOME, AVATAR GROUP AND FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Good Morning,{' '}
              <span className="text-[#3b82f6]">Admin</span>
            </h1>

            <p className="text-base text-slate-500 mt-2">
              Welcome back to NANDGATE-IT workforce management overview.
            </p>

            {/* ACTIVE EMPLOYEE AVATAR GROUP */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center">
                {activeEmployees.slice(0, 5).map((employee, index) => (
                  <div
                    key={employee.id}
                    title={employee.name}
                    aria-label={employee.name}
                    className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#f0f6fa] ${
                      index > 0 ? '-ml-2' : ''
                    } ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                  >
                    {getInitials(employee.name)}
                  </div>
                ))}

                {activeEmployees.length > 5 && (
                  <div className="-ml-2 h-9 min-w-9 px-2 rounded-full bg-white flex items-center justify-center text-[11px] font-bold text-slate-500 ring-2 ring-[#f0f6fa]">
                    +{activeEmployees.length - 5}
                  </div>
                )}
              </div>

              <span className="text-sm font-semibold text-slate-500">
                {loading ? 'Loading employees...' : `${totalEmployees} Total Employees`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeFilter}
              onChange={(e) =>
                setTimeFilter(e.target.value as Period)
              }
              className="px-5 py-3 bg-white border border-slate-200/80 rounded-full text-sm font-medium text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 cursor-pointer"
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
              className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm text-slate-500 hover:text-blue-600 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />

              <div>
                <p className="font-semibold text-rose-700">
                  Dashboard could not be loaded
                </p>

                <p className="text-sm text-rose-600 mt-1">
                  {error}
                </p>
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

        {/* ================= STATS ROW ================= */}
        <section className="grid gap-6 xl:grid-cols-2">

          {/* ATTENDANCE TODAY + HOURS WORKED */}
          <div className="grid grid-cols-1 gap-8 rounded-[32px] border border-[#e6edf4] bg-white p-8 shadow-sm sm:grid-cols-2">

            {/* Attendance today */}
            <div className="flex justify-between gap-2">
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-[15px] font-bold leading-tight text-slate-900">
                    Attendance
                    <br />
                    Today
                  </p>
                  <p className="mt-1 text-[44px] font-black leading-none text-slate-900">
                    {loading ? '—' : `${presentPct}%`}
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-medium text-slate-400">
                    In office now
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {loading ? '—' : `${counts?.in ?? 0} of ${totalCount}`}
                  </p>
                </div>
              </div>

              <div className="self-end">
                <AttendanceProgress percent={presentPct} />
              </div>
            </div>

            {/* Total hours worked */}
            <div className="flex justify-between gap-2">
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-[15px] font-bold leading-tight text-slate-900">
                    Hours
                    <br />
                    Worked
                  </p>
                  <p className="mt-1 text-[44px] font-black leading-none text-slate-900">
                    {loading
                      ? '—'
                      : totalHours.toLocaleString('en-IN', {
                          maximumFractionDigits: 1,
                        })}
                    <span className="ml-1 text-lg font-bold">hrs</span>
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-medium text-slate-400">
                    Selected period
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {periodLabel}
                  </p>
                </div>
              </div>

              <div className="self-center">
                <BubbleCluster />
              </div>
            </div>
          </div>

          {/* In office / Not yet in / Absent – width follows % of workforce */}
          <div className="flex min-h-[215px]">
            {segments.map((seg, index) => (
              <div
                key={seg.key}
                className="relative flex flex-col justify-end rounded-[32px] p-5 sm:p-6"
                style={{
                  flexGrow: Math.max(pctOf(seg.count), 14),
                  flexBasis: 0,
                  backgroundColor: seg.color,
                  color: seg.text,
                }}
              >
                <p className="absolute left-5 top-5 text-[13px] font-bold sm:left-6 sm:top-6">
                  {seg.label}
                </p>

                {seg.sample ? (
                  <span
                    title={seg.sample.name}
                    className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ring-4 ring-white/80 ${
                      AVATAR_COLORS[(index * 4) % AVATAR_COLORS.length]
                    }`}
                  >
                    {getInitials(seg.sample.name)}
                  </span>
                ) : (
                  <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-500 ring-4 ring-white/60">
                    <seg.Icon className="h-4 w-4" />
                  </span>
                )}

                <p className="text-[44px] font-black leading-none">
                  {loading ? '—' : seg.count}
                </p>

                <div className="mt-4 text-[11px] font-bold leading-snug">
                  <p>{pctOf(seg.count)}%</p>
                  <p>of workforce</p>
                  <p className={`font-medium ${seg.muted}`}>{seg.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ATTENDANCE CHART */}
          <div className="lg:col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-[#e6edf4] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-xl text-slate-900">
                  Attendance &amp; Shift Activity
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  {periodLabel} attendance activity
                </p>
              </div>

              <HelpCircle className="w-6 h-6 text-slate-300" />
            </div>

            <div className="relative h-72 lg:h-80 w-full flex items-end flex-1">
              {chartData.length > 0 ? (
                <svg
                  className="w-full h-full overflow-visible"
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
                    d={chartAreaPath}
                    fill="url(#blueGrad)"
                  />

                  <path
                    d={chartPath}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                    >
                      <title>
                        {formatDate(point.date, timeFilter)}: {point.work_hours} hours
                      </title>
                    </circle>
                  ))}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  {loading
                    ? 'Loading attendance chart...'
                    : 'No attendance data available for this period.'}
                </div>
              )}
            </div>

            <div className="flex justify-between flex-wrap gap-2 text-xs sm:text-sm font-semibold text-slate-400 mt-6 px-1">
              {chartData.length > 0 &&
                chartData
                  .filter((_, index) => {
                    const step = Math.max(
                      1,
                      Math.ceil(chartData.length / 7)
                    );

                    return (
                      index % step === 0 ||
                      index === chartData.length - 1
                    );
                  })
                  .map((item) => (
                    <span key={item.date}>
                      {formatDate(item.date, timeFilter)}
                    </span>
                  ))}
            </div>

            <div className="flex flex-wrap gap-5 mt-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-600" />
                Working Hours
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400" />
                Late Count: {dashboard?.attendance_summary.late_count ?? 0}
              </div>
            </div>
          </div>

          {/* WORKFORCE STATUS */}
          <div className="lg:col-span-4 bg-white rounded-[32px] p-8 shadow-sm border border-[#e6edf4] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-xl text-slate-900">
                  Workforce Status
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  Live Punch Distribution
                </p>
              </div>

              <HelpCircle className="w-6 h-6 text-slate-300" />
            </div>

            <div className="relative flex items-center justify-center my-8 flex-1">
              <svg
                className="w-48 h-48 lg:w-56 lg:h-56 -rotate-90"
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
                        />
                      );

                      offset += segmentLength;

                      return circle;
                    });
                  })()}
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900">
                  {loading ? '—' : donutTotal}
                </span>

                <span className="text-xs text-slate-400 font-medium">
                  Employees
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm text-slate-600 font-medium pt-4">
              {donutItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />

                  <span>
                    {item.label}{' '}
                    <span className="font-bold text-slate-800">
                      ({item.value})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ATTENDANCE BREAKDOWN (only details not shown in the cards above) */}
        <section>
          <div className="flex items-end justify-between">
            <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900">
              Attendance Breakdown
            </h2>

            <span className="text-xs font-semibold text-slate-400">
              {totalCount} Total Employees
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {detailCards.map((card) => (
              <div
                key={card.key}
                className="relative flex min-h-[180px] flex-col justify-end rounded-[32px] p-5"
                style={{ backgroundColor: card.color, color: card.text }}
              >
                <p className="absolute left-5 top-5 max-w-[60%] text-[13px] font-bold leading-tight">
                  {card.label}
                </p>

                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/60">
                  <card.Icon className="h-4 w-4" />
                </span>

                <p className="text-[40px] font-black leading-none">
                  {loading ? '—' : card.value}
                </p>

                <div className="mt-4 text-[11px] font-bold leading-snug">
                  <p>{card.line}</p>
                  <p className={`font-medium ${card.muted}`}>{card.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PENDING REQUESTS (bubbles) AND DEVICE HEALTH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e6edf4]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-slate-900">
                Pending Requests
              </h3>

              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {dashboard?.pending_requests.total ?? 0} Total
              </span>
            </div>

            <div className="grid grid-cols-3 items-end gap-4 py-2">
              {[
                {
                  label: 'Leave',
                  value: dashboard?.pending_requests.leave ?? 0,
                  color: BLUE,
                  text: '#ffffff',
                },
                {
                  label: 'Permission',
                  value: dashboard?.pending_requests.permission ?? 0,
                  color: SKY,
                  text: INK,
                },
                {
                  label: 'Regularization',
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

                  <span className="text-xs font-semibold text-slate-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e6edf4]">
            <h3 className="font-bold text-lg text-slate-900 mb-5">
              Device Health
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.devices.total ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Online</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {dashboard?.devices.ok ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Alert</p>
                <p className="text-2xl font-bold text-rose-600">
                  {dashboard?.devices.alert ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Inactive</p>
                <p className="text-2xl font-bold text-slate-500">
                  {dashboard?.devices.inactive ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        </div>
      </main>

    </div>
  );
}