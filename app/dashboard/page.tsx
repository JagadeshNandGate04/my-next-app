
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  AlertCircle,
  Clock,
  Users,
  Settings,
  Calendar,
  UserCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import Sidebar from '../components/SideBar';

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

export default function NandgateDashboard() {
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
        throw new Error(
          'Authentication token not found. Please log in again.'
        );
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
  }, [timeFilter]);

  useEffect(() => {
    fetchDashboard();
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

  return (
    <div className="min-h-screen w-full bg-[#f0f6fa] font-sans antialiased text-slate-800 selection:bg-[#7BBDE8]/30 flex">
      <Sidebar />

      <main className="flex-1 min-w-0 p-5 lg:p-10 flex flex-col space-y-8 overflow-y-auto">

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
              className="w-full pl-14 pr-12 py-4 bg-white rounded-2xl text-base text-slate-700 placeholder-slate-400 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
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
                            {employee.name?.trim()
                              ? employee.name
                                  .trim()
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((word) => word.charAt(0))
                                  .join('')
                                  .toUpperCase()
                              : '?'}
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

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800">
              <Users className="w-5 h-5" />
            </button>

            <button className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800">
              <Bell className="w-5 h-5" />
            </button>

            <button className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800">
              <Settings className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pl-4 py-1.5 pr-1.5 bg-white border border-slate-200/80 rounded-full shadow-sm">
              <span className="text-sm font-semibold text-slate-700">
                Admin
              </span>

              <div className="w-9 h-9 rounded-full bg-[#7BBDE8] text-white font-bold text-sm flex items-center justify-center">
                A
              </div>
            </div>
          </div>
        </header>

        {/* WELCOME AND FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Good Morning,{' '}
              <span className="text-[#3b82f6]">Admin</span>
            </h1>

            <p className="text-base text-slate-500 mt-2">
              Welcome back to NANDGATE-IT workforce management overview.
            </p>
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

        {/* PRIMARY METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* TOTAL EMPLOYEES */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between mb-8">
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl lg:text-6xl font-black text-slate-900">
                    {loading ? '—' : totalEmployees}
                  </span>

                  <span className="text-base font-semibold text-slate-500">
                    Total Employees
                  </span>
                </div>

                <span className="text-sm font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-4 py-1.5 rounded-full">
                  Active
                </span>
              </div>

              {/* ACTIVE EMPLOYEE AVATARS ONLY */}
              <div className="my-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base text-slate-500 font-medium">
                    Active employees in your workforce
                  </span>

                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {activeEmployees.length}
                  </span>
                </div>

                {loading && !dashboard ? (
                  <p className="text-sm text-slate-400 py-3">
                    Loading employees...
                  </p>
                ) : activeEmployees.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3 max-h-64 overflow-y-auto pr-2 py-1">
                    {activeEmployees.map((employee, index) => (
                      <div
                        key={employee.id}
                        title={employee.name}
                        aria-label={employee.name}
                        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm border-2 border-white ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                      >
                        {employee.name?.trim()
                          ? employee.name
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((word) => word.charAt(0))
                              .join('')
                              .toUpperCase()
                          : '?'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-3">
                    No active employees found.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50 text-base font-bold mt-4">
              <span className="text-slate-600">
                Workforce Overview
              </span>

              <span className="text-emerald-700 bg-emerald-100/70 px-4 py-1.5 rounded-full text-sm">
                {loading ? 'Loading...' : `${totalEmployees} Active`}
              </span>
            </div>
          </div>

          {/* TOTAL HOURS */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-[#7BBDE8]">
                    <Clock className="w-7 h-7" />
                  </div>

                  <div>
                    <div className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                      {loading ? '—' : totalHours.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-3xl font-bold">hrs</span>
                    </div>

                    <div className="text-base font-semibold text-slate-500 mt-2">
                      Total Hours Worked (All Employees)
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {periodLabel}
                    </p>
                  </div>
                </div>

                <HelpCircle className="w-6 h-6 text-slate-300" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50 text-base font-bold mt-8">
              <span className="text-slate-600">
                Selected Period
              </span>

              <span className="text-emerald-700 bg-emerald-100/70 px-4 py-1.5 rounded-full text-sm">
                {filterLabel}
              </span>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ATTENDANCE CHART */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
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
          <div className="lg:col-span-4 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
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

        {/* BOTTOM ATTENDANCE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pb-4">

          {/* IN OFFICE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-[#7BBDE8]">
                  <UserCheck className="w-6 h-6" />
                </div>

                <span className="text-4xl font-black text-slate-900">
                  {loading ? '—' : counts?.in ?? 0}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-600">
                In Office Now
              </h4>
            </div>

            <div className="flex items-center justify-between text-sm font-semibold text-slate-400 pt-5 border-t border-slate-50 mt-5">
              <span className="text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md">
                Currently IN
              </span>

              <span>
                {counts?.total_employees ?? 0} Employees
              </span>
            </div>
          </div>

          {/* NOT YET IN */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>

                <span className="text-4xl font-black text-slate-900">
                  {loading ? '—' : counts?.no_punch_yet ?? 0}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-600">
                Not Yet In
              </h4>
            </div>

            <div className="flex items-center justify-between text-sm font-semibold text-slate-400 pt-5 border-t border-slate-50 mt-5">
              <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                No Punch
              </span>

              <span>Awaiting Punch</span>
            </div>
          </div>

          {/* ON LEAVE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Calendar className="w-6 h-6" />
                </div>

                <span className="text-4xl font-black text-slate-900">
                  {loading ? '—' : counts?.on_leave ?? 0}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-600">
                On Leave
              </h4>
            </div>

            <div className="flex items-center justify-between text-sm font-semibold text-slate-400 pt-5 border-t border-slate-50 mt-5">
              <span className="font-bold text-slate-700">
                {dashboard?.pending_requests.leave ?? 0} Req
              </span>

              <span>Pending Leave</span>
            </div>
          </div>

          {/* ABSENT */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-rose-100 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <span className="text-4xl font-black text-slate-900">
                  {loading ? '—' : counts?.absent ?? 0}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-600">
                Absent
              </h4>
            </div>

            <div className="pt-5 border-t border-slate-50 mt-5 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase bg-rose-600 text-white px-3 py-1.5 rounded-lg">
                Action
              </span>

              <span className="text-sm font-bold text-rose-500">
                {dashboard?.unregularized_days_this_month ?? 0} Unregularized
              </span>
            </div>
          </div>
        </div>

        {/* ADDITIONAL ATTENDANCE COUNTS */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-900 mb-5">
            Other Attendance Details
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-sm text-slate-400">Checked Out</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {counts?.out ?? 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Weekly Off</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {counts?.weekly_off ?? 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Insufficient</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {counts?.insufficient ?? 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Late Arrivals</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {dashboard?.attendance_summary.late_count ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* PENDING REQUESTS AND DEVICE HEALTH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 mb-5">
              Pending Requests
            </h3>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-sm text-slate-400">Leave</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.pending_requests.leave ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Permission</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.pending_requests.permission ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Regularization</p>
                <p className="text-2xl font-bold text-slate-800">
                  {dashboard?.pending_requests.regularization ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">Total Pending</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboard?.pending_requests.total ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
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

      </main>
    </div>
  );
}
