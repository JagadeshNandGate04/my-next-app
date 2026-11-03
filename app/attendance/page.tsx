"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store/store";

import {
  fetchDailyAttendance,
  fetchMonthlyAttendance,
  addAttendanceCorrection,
  clearMonthlyAttendance,
} from "@/app/store/attendance/attendanceSlice";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Download,
  AlertTriangle,
  History,
  Lock,
  X,
  UserCheck,
  RefreshCw,
  CalendarDays,
  Clock,
  Users,
  // --- icons added only for the new roster table design ---
  ListFilter,
  CheckCircle2,
  TimerOff,
  Flag,
  Pencil,
  ClipboardCheck,
  PlusCircle,
} from "lucide-react";

import Sidebar from "../components/SideBar";

type CorrectionDirection = "IN" | "OUT";

const getLocalDate = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";

  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDuration = (mins: number) => {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const formatPunchTime = (value: string | null) => {
  if (!value) return "--:--:--";

  const timePart = value.includes("T")
    ? value.split("T")[1]
    : value.includes(" ")
      ? value.split(" ")[1]
      : value;

  return timePart ? timePart.slice(0, 8) : value;
};

const formatMonth = (month: number, year: number) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const getMonthDays = (month: number, year: number) => {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();

  return {
    firstDay,
    totalDays,
  };
};

const getDayStatus = (day: any, dateString: string, today: string) => {
  if (dateString > today) return "UPCOMING";

  if (!day?.summary) return "NO_RECORD";

  const summary = day.summary;

  const status = String(
    summary.status ??
      summary.attendance_status ??
      summary.day_status ??
      summary.status_code ??
      ""
  ).toUpperCase();

  if (status) {
    if (status.includes("WEEKLY")) return "WEEKLY_OFF";
    if (status.includes("HOLIDAY")) return "HOLIDAY";
    if (status.includes("LEAVE")) return "LEAVE";
    if (status.includes("HALF")) return "HALF_DAY";
    if (status.includes("ABSENT")) return "ABSENT";
    if (status.includes("INSUFFICIENT")) return "INSUFFICIENT";
    if (status.includes("PRESENT")) return "PRESENT";
  }

  const workMinutes = Number(
    summary.work_min ?? summary.work_minutes ?? summary.work_minutes_total ?? 0
  );

  if (workMinutes > 0) return "PRESENT";

  return "NO_RECORD";
};

const statusStyles: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  HALF_DAY: "bg-amber-100 text-amber-800 border-amber-200",
  ABSENT: "bg-rose-100 text-rose-800 border-rose-200",
  LEAVE: "bg-violet-100 text-violet-800 border-violet-200",
  HOLIDAY: "bg-sky-100 text-sky-800 border-sky-200",
  WEEKLY_OFF: "bg-slate-200 text-slate-700 border-slate-300",
  INSUFFICIENT: "bg-orange-100 text-orange-800 border-orange-200",
  NO_RECORD: "bg-slate-50 text-slate-500 border-slate-200",
  UPCOMING: "bg-blue-50 text-blue-700 border-blue-200",
};

// --------------------------------------------------
// DISPLAY-ONLY HELPERS (roster table design)
// These only format/colour what the API already returns.
// --------------------------------------------------

const parseClock = (value: string | null) => {
  if (!value) return null;

  const raw = value.includes("T")
    ? value.split("T")[1]
    : value.includes(" ")
      ? value.split(" ")[1]
      : value;

  if (!raw) return null;

  const [hh, mm = "00", ss = "00"] = raw.slice(0, 8).split(":");
  const hour = Number(hh);

  if (Number.isNaN(hour)) return null;

  return {
    hour12: String(hour % 12 || 12).padStart(2, "0"),
    mm,
    ss: ss.slice(0, 2),
    meridiem: hour >= 12 ? "PM" : "AM",
  };
};

const formatClock12 = (value: string | null) => {
  const clock = parseClock(value);
  return clock
    ? `${clock.hour12}:${clock.mm}:${clock.ss} ${clock.meridiem}`
    : null;
};

const formatShort12 = (value: string | null) => {
  const clock = parseClock(value);
  return clock ? `${clock.hour12}:${clock.mm} ${clock.meridiem}` : null;
};

// Avatar gradient palette – picked per employee so each person keeps the same colour
const avatarGradients = [
  "from-cyan-400 to-blue-600",
  "from-amber-400 to-orange-600",
  "from-indigo-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-emerald-400 to-teal-600",
];

const getAvatarGradient = (userId: number | string) => {
  const index = Math.abs(Number(userId)) % avatarGradients.length;
  return avatarGradients[Number.isNaN(index) ? 0 : index];
};

function TimePill({
  value,
  tone,
}: {
  value: string | null;
  tone: "late" | "live" | "plain";
}) {
  if (!value) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-2 font-mono text-xs font-bold text-slate-400 whitespace-nowrap">
        --:--:--
      </span>
    );
  }

  const wrapper =
    tone === "late"
      ? "bg-amber-50 border-amber-300 text-amber-900"
      : "bg-slate-100 border-slate-200 text-slate-900";

  const icon =
    tone === "late"
      ? "text-amber-600"
      : tone === "live"
        ? "text-blue-600"
        : "text-slate-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-2 font-mono text-xs font-bold whitespace-nowrap ${wrapper}`}
    >
      <Clock className={`w-3.5 h-3.5 shrink-0 ${icon}`} />
      {formatClock12(value) ?? formatPunchTime(value)}
    </span>
  );
}

export default function AdminAttendanceOperationsPage() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    dailyAttendance,
    dailyLoading,
    dailyError,
    correctionLoading,
    correctionError,
    correctionSuccess,
    monthlyAttendance,
    monthlyLoading,
    monthlyError,
  } = useSelector((state: RootState) => state.attendance);

  // --------------------------------------------------
  // DATE INITIALIZATION
  // --------------------------------------------------

  const [selectedDate, setSelectedDate] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [dateInitialized, setDateInitialized] = useState(false);

  const [activeTab, setActiveTab] = useState<"DAILY" | "MONTHLY">("DAILY");

  const [filterRoster, setFilterRoster] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // --------------------------------------------------
  // MONTHLY INSPECTOR STATE
  // --------------------------------------------------

  const [monthlyEmployeeId, setMonthlyEmployeeId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [monthlyInitialized, setMonthlyInitialized] = useState(false);

  // --------------------------------------------------
  // CORRECTION MODAL
  // --------------------------------------------------

  const [isAddCorrectionOpen, setIsAddCorrectionOpen] = useState(false);

  const [newCorrection, setNewCorrection] = useState({
    user_id: "",
    punched_at: "",
    direction: "IN" as CorrectionDirection,
    reason: "",
  });

  useEffect(() => {
    const today = getLocalDate();
    const now = new Date();

    setTodayDate(today);
    setSelectedDate(today);
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());

    setNewCorrection((previous) => ({
      ...previous,
      punched_at: `${today}T09:00`,
    }));

    setMonthlyInitialized(true);
    setDateInitialized(true);
  }, []);

  // --------------------------------------------------
  // DAILY ATTENDANCE FETCH
  // --------------------------------------------------

  useEffect(() => {
    if (!dateInitialized || !selectedDate) return;

    dispatch(fetchDailyAttendance(selectedDate));
  }, [dispatch, selectedDate, dateInitialized]);

  // --------------------------------------------------
  // EMPLOYEE DATA
  // --------------------------------------------------

  const employees = dailyAttendance?.employees || [];

  const totalEmployees = dailyAttendance?.total ?? employees.length;

  // --------------------------------------------------
  // MONTHLY ATTENDANCE FETCH
  // --------------------------------------------------

  useEffect(() => {
    if (
      activeTab !== "MONTHLY" ||
      !monthlyInitialized ||
      !monthlyEmployeeId
    ) {
      return;
    }

    dispatch(
      fetchMonthlyAttendance({
        user_id: Number(monthlyEmployeeId),
        month: selectedMonth,
        year: selectedYear,
      })
    );
  }, [
    dispatch,
    activeTab,
    monthlyInitialized,
    monthlyEmployeeId,
    selectedMonth,
    selectedYear,
  ]);

  // --------------------------------------------------
  // DAILY STATISTICS
  // --------------------------------------------------

  const stats = useMemo(() => {
    const liveIn = employees.filter(
      (employee) => employee.live_status === "IN"
    ).length;

    const present = employees.filter(
      (employee) => employee.status === "PRESENT"
    ).length;

    const absent = employees.filter(
      (employee) => employee.status === "ABSENT"
    ).length;

    const late = employees.filter(
      (employee) => employee.flags?.is_late
    ).length;

    const regularization = employees.filter(
      (employee) => employee.flags?.needs_regularization
    ).length;

    const excessBreak = employees.filter(
      (employee) => employee.flags?.excess_break
    ).length;

    const leave = employees.filter(
      (employee) => employee.status === "LEAVE"
    ).length;

    const halfDay = employees.filter(
      (employee) => employee.status === "HALF_DAY"
    ).length;

    const coverage =
      totalEmployees > 0
        ? ((liveIn / totalEmployees) * 100).toFixed(1)
        : "0.0";

    return {
      liveIn,
      present,
      absent,
      late,
      regularization,
      excessBreak,
      leave,
      halfDay,
      coverage,
    };
  }, [employees, totalEmployees]);

  // --------------------------------------------------
  // DAILY SEARCH AND FILTER
  // --------------------------------------------------

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(query) ||
        employee.emp_code.toLowerCase().includes(query) ||
        employee.designation.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (filterRoster === "LIVE_IN") {
        return employee.live_status === "IN";
      }

      if (filterRoster === "LATE") {
        return employee.flags?.is_late;
      }

      if (filterRoster === "REGULARIZATION") {
        return employee.flags?.needs_regularization;
      }

      if (filterRoster === "ABSENT") {
        return employee.status === "ABSENT";
      }

      return true;
    });
  }, [employees, filterRoster, searchQuery]);

  // --------------------------------------------------
  // DATE NAVIGATION
  // --------------------------------------------------

  const changeDate = (days: number) => {
    if (!selectedDate) return;

    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);

    const updatedDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    setSelectedDate(updatedDate);

    setNewCorrection((previous) => ({
      ...previous,
      punched_at: `${updatedDate}T09:00`,
    }));
  };

  const selectToday = () => {
    setSelectedDate(todayDate);

    setNewCorrection((previous) => ({
      ...previous,
      punched_at: `${todayDate}T09:00`,
    }));
  };

  const formattedSelectedDate = formatDate(selectedDate);
  const isCurrentDate = selectedDate === todayDate;

  // --------------------------------------------------
  // MONTH NAVIGATION
  // --------------------------------------------------

  const changeMonth = (direction: number) => {
    const date = new Date(selectedYear, selectedMonth - 1 + direction, 1);

    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const selectCurrentMonth = () => {
    const now = new Date();

    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const monthlyDays = monthlyAttendance?.days || [];
  const monthlyTotals = monthlyAttendance?.totals;

  const monthlyDayMap = useMemo(() => {
    const map = new Map<string, any>();

    monthlyDays.forEach((day) => {
      map.set(day.date, day);
    });

    return map;
  }, [monthlyDays]);

  const { firstDay, totalDays } = getMonthDays(
    selectedMonth,
    selectedYear
  );

  const calendarCells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ];

  const monthlyEmployee = monthlyAttendance?.employee;

  // --------------------------------------------------
  // CORRECTION
  // --------------------------------------------------

  const handleAddCorrection = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !newCorrection.user_id ||
      !newCorrection.punched_at ||
      !newCorrection.reason.trim()
    ) {
      return;
    }

    try {
      await dispatch(
        addAttendanceCorrection({
          user_id: Number(newCorrection.user_id),
          punched_at: newCorrection.punched_at,
          direction: newCorrection.direction,
          reason: newCorrection.reason.trim(),
        })
      ).unwrap();

      setIsAddCorrectionOpen(false);

      setNewCorrection({
        user_id: "",
        punched_at: `${selectedDate}T09:00`,
        direction: "IN",
        reason: "",
      });

      dispatch(fetchDailyAttendance(selectedDate));

      if (monthlyEmployeeId) {
        dispatch(
          fetchMonthlyAttendance({
            user_id: Number(monthlyEmployeeId),
            month: selectedMonth,
            year: selectedYear,
          })
        );
      }
    } catch (error) {
      console.error("Correction failed:", error);
    }
  };

  const openCorrectionForEmployee = (employee: (typeof employees)[number]) => {
    setNewCorrection({
      user_id: String(employee.user_id),
      punched_at: `${selectedDate}T09:00`,
      direction: "IN",
      reason: "",
    });

    setIsAddCorrectionOpen(true);
  };

  // --------------------------------------------------
  // CSV EXPORT
  // --------------------------------------------------

  const handleExport = () => {
    if (!employees.length) return;

    const headers = [
      "Employee ID",
      "Employee Name",
      "Designation",
      "Status",
      "Live Status",
      "First In",
      "Last Out",
      "Work Duration (Minutes)",
      "Late",
      "Excess Break",
      "Needs Regularization",
    ];

    const rows = employees.map((employee) => [
      employee.emp_code,
      employee.name,
      employee.designation,
      employee.status,
      employee.live_status,
      employee.first_in || "",
      employee.last_out || "",
      employee.work_min,
      employee.flags.is_late ? "Yes" : "No",
      employee.flags.excess_break ? "Yes" : "No",
      employee.flags.needs_regularization ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // INITIAL LOADING
  // --------------------------------------------------

  if (!dateInitialized || !monthlyInitialized) {
    return (
      <div className="min-h-screen bg-[#f5faff] lg:flex">
        <Sidebar />

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1b64da] mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">
              Initializing attendance...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5faff] text-[#1e293b] font-sans antialiased lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-7">

          {/* HEADER */}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef4fa] border border-[#d5dbe1] text-xs font-bold tracking-wide text-[#64748b] uppercase mb-2">
                <Lock className="w-3.5 h-3.5 text-[#1b64da]" />
                Attendance Operations
              </div>

              <h1 className="text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
                Admin Attendance Operations
              </h1>

              <p className="text-base font-medium text-[#64748b] mt-2">
                Employee attendance, biometric punches and attendance corrections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">

              {activeTab === "DAILY" ? (
                <div className="flex items-center bg-white border border-[#d5dbe1] rounded-2xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => changeDate(-1)}
                    className="p-2.5 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 px-3 py-1 font-bold text-sm text-[#0f172a]">
                    <CalendarIcon className="w-4 h-4 text-[#1b64da]" />
                    <span>{formattedSelectedDate}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => changeDate(1)}
                    className="p-2.5 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Next day"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={selectToday}
                    className={`ml-1 px-3 py-2 text-sm font-bold rounded-xl ${
                      isCurrentDate
                        ? "bg-[#1b64da] text-white"
                        : "bg-[#eef4fa] text-[#1b64da] hover:bg-[#dbeafe]"
                    }`}
                  >
                    Today
                  </button>
                </div>
              ) : (
                <div className="flex items-center bg-white border border-[#d5dbe1] rounded-2xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="p-2.5 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="px-4 text-sm font-bold text-slate-800 min-w-[150px] text-center">
                    {formatMonth(selectedMonth, selectedYear)}
                  </span>

                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-2.5 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={selectCurrentMonth}
                    className="ml-1 px-3 py-2 text-sm font-bold rounded-xl bg-[#eef4fa] text-[#1b64da] hover:bg-[#dbeafe]"
                  >
                    Current
                  </button>
                </div>
              )}

              <div className="flex items-center bg-white border border-[#d5dbe1] rounded-2xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab("DAILY")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                    activeTab === "DAILY"
                      ? "bg-[#1b64da] text-white"
                      : "text-[#64748b]"
                  }`}
                >
                  Daily Board
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("MONTHLY")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                    activeTab === "MONTHLY"
                      ? "bg-[#1b64da] text-white"
                      : "text-[#64748b]"
                  }`}
                >
                  Monthly Inspector
                </button>
              </div>

              {activeTab === "DAILY" && (
                <button
                  type="button"
                  onClick={() => setIsAddCorrectionOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#1b64da] hover:bg-[#1552b5] text-white text-sm font-bold rounded-2xl shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Manual Correction Punch
                </button>
              )}
            </div>
          </div>

          {/* ==========================================
              DAILY BOARD
          ========================================== */}

          {activeTab === "DAILY" && (
            <>
              {/* DAILY KPI CARDS */}

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  {
                    title: "Total Employees",
                    value: totalEmployees,
                    subtitle: "Employees returned for this date",
                    color: "text-slate-900",
                    icon: <UserCheck className="w-5 h-5 text-blue-600" />,
                  },
                  {
                    title: "Present / Live",
                    value: stats.liveIn,
                    subtitle: `${stats.coverage}% currently in office`,
                    color: "text-sky-600",
                    icon: <Users className="w-5 h-5 text-sky-600" />,
                  },
                  {
                    title: "Absent",
                    value: stats.absent,
                    subtitle: `Leave: ${stats.leave} · Half day: ${stats.halfDay}`,
                    color: "text-rose-600",
                    icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
                  },
                  {
                    title: "Late Arrivals",
                    value: stats.late,
                    subtitle: "Based on backend late flag",
                    color: "text-amber-600",
                    icon: <Clock className="w-5 h-5 text-amber-600" />,
                  },
                  {
                    title: "Needs Correction",
                    value: stats.regularization,
                    subtitle: `Excess break: ${stats.excessBreak}`,
                    color: "text-indigo-600",
                    icon: <AlertTriangle className="w-5 h-5 text-indigo-600" />,
                  },
                  {
                    title: "Payroll Cycle",
                    value: "Date-specific",
                    subtitle: "Lock status is shown per employee",
                    color: "text-slate-900",
                    icon: <Lock className="w-5 h-5 text-emerald-600" />,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-white border border-[#d5dbe1] rounded-3xl p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
                        {item.title}
                      </span>
                      {item.icon}
                    </div>

                    <div className={`text-3xl font-black ${item.color}`}>
                      {dailyLoading ? "—" : item.value}
                    </div>

                    <p className="text-sm font-medium text-[#64748b] mt-2">
                      {item.subtitle}
                    </p>
                  </div>
                ))}
              </div>

              {/* DAILY ROSTER */}

              <div className="bg-white border border-[#e6edf4] rounded-[28px] shadow-sm overflow-hidden">
                {/* ---------- TOOLBAR (filter pills + search + export) ---------- */}
                <div className="p-5 lg:p-6 bg-[#f7f9fd] border-b border-[#e8eef5] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {[
                      { key: "ALL", label: `All Roster (${totalEmployees})` },
                      { key: "LIVE_IN", label: `Live In (${stats.liveIn})` },
                      { key: "LATE", label: `Late (${stats.late})` },
                      {
                        key: "REGULARIZATION",
                        label: `Needs Regularization (${stats.regularization})`,
                      },
                      { key: "ABSENT", label: `Absent (${stats.absent})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterRoster(tab.key)}
                        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                          filterRoster === tab.key
                            ? "bg-[#0a4ec4] text-white shadow-sm"
                            : "bg-[#e9edf5] text-slate-600 hover:bg-[#dfe5ef]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-80">
                      <ListFilter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />

                      <input
                        type="text"
                        placeholder="Search by name, ID or role..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-transparent shadow-sm text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={!employees.length}
                      aria-label="Export attendance"
                      className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full bg-[#e9edf5] hover:bg-[#dfe5ef] text-slate-700 shadow-sm disabled:opacity-40"
                    >
                      <Download className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => dispatch(fetchDailyAttendance(selectedDate))}
                      disabled={dailyLoading}
                      aria-label="Refresh attendance"
                      className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full bg-[#e9edf5] hover:bg-[#dfe5ef] text-slate-700 shadow-sm disabled:opacity-40"
                    >
                      <RefreshCw className={`w-5 h-5 ${dailyLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {dailyLoading && (
                  <div className="p-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#1b64da] mx-auto mb-3" />
                    <p className="text-base font-semibold text-[#64748b]">
                      Fetching attendance records...
                    </p>
                  </div>
                )}

                {!dailyLoading && dailyError && (
                  <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <p className="text-base font-bold text-rose-700">
                      Unable to load attendance
                    </p>
                    <p className="text-sm text-rose-600 mt-1">{dailyError}</p>
                    <button
                      type="button"
                      onClick={() => dispatch(fetchDailyAttendance(selectedDate))}
                      className="mt-3 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!dailyLoading && !dailyError && (
                  <div className="w-full">
                    <table className="w-full table-fixed text-left border-collapse">
                      <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[15%]" />
                        <col className="w-[10%]" />
                        <col className="w-[12%]" />
                        <col className="w-[14%]" />
                        <col className="w-[15%]" />
                        <col className="w-[12%]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#eef1f6] border-b border-[#e3e8f0] text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-4 px-3">Employee</th>
                          <th className="py-4 px-3">Status & Live Feed</th>
                          <th className="py-4 px-3">First In</th>
                          <th className="py-4 px-3">Last Out</th>
                          <th className="py-4 px-3">Work Duration</th>
                          <th className="py-4 px-3">Audit Flags</th>
                          <th className="py-4 px-3 text-right">Operations</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#eef1f6] text-sm">
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((employee) => {
                            const isLive = employee.live_status === "IN";
                            const isLate = Boolean(employee.flags.is_late);
                            const isHalfDay = employee.status === "HALF_DAY";
                            const hasWork = employee.work_min > 0;
                            const hasFirstIn = Boolean(employee.first_in);
                            const noPunch = !hasFirstIn && employee.status === "ABSENT";

                            const percent = Math.min(
                              100,
                              Math.round((employee.work_min / 480) * 100)
                            );

                            // duration colours
                            const durationText = !hasWork
                              ? "text-slate-400"
                              : isHalfDay
                                ? "text-teal-700"
                                : isLate
                                  ? "text-slate-800"
                                  : "text-sky-700";

                            const barFill = isHalfDay
                              ? "from-teal-700 to-teal-500"
                              : isLate
                                ? "from-amber-500 to-orange-500"
                                : "from-blue-600 to-cyan-400";

                            const percentText = isLate ? "text-amber-600" : "text-blue-600";

                            return (
                              <tr
                                key={employee.user_id}
                                className="bg-white hover:bg-[#f8faff] transition-colors"
                              >
                                {/* EMPLOYEE */}
                                <td className="py-4 px-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div
                                      className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                        employee.user_id
                                      )} text-white font-black flex items-center justify-center text-base shadow-sm`}
                                    >
                                      {employee.name.slice(0, 2).toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap text-sm">
                                        <span className="truncate">{employee.name}</span>
                                        <span className="text-[10px] font-bold text-blue-700 bg-[#dbe5ff] px-2 py-0.5 rounded-full whitespace-nowrap">
                                          {employee.emp_code}
                                        </span>
                                      </div>

                                      <div className="text-xs text-slate-600 font-medium mt-1 truncate">
                                        {employee.designation}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* STATUS & LIVE FEED */}
                                <td className="py-4 px-3">
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-xs leading-tight">
                                        <span className="block font-bold">IN OFFICE</span>
                                        {formatShort12(employee.first_in) && (
                                          <span className="block font-semibold">
                                            ({formatShort12(employee.first_in)})
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  ) : noPunch ? (
                                    <span className="inline-flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                                      <span className="text-xs leading-tight font-bold">
                                        <span className="block">NO PUNCH</span>
                                        <span className="block">RECORDED</span>
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200">
                                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                                      <span className="text-xs leading-tight">
                                        {employee.last_out ? (
                                          <>
                                            <span className="block font-semibold">LOGGED OUT</span>
                                            <span className="block font-medium">
                                              ({formatShort12(employee.last_out)})
                                            </span>
                                          </>
                                        ) : (
                                          <span className="block font-semibold">
                                            {employee.status.replace("_", " ")}
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  )}
                                </td>

                                {/* FIRST IN */}
                                <td className="py-4 px-3">
                                  <TimePill
                                    value={employee.first_in}
                                    tone={isLate ? "late" : isLive ? "live" : "plain"}
                                  />
                                </td>

                                {/* LAST OUT */}
                                <td className="py-4 px-3">
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-2 px-2.5 py-2 rounded-full bg-[#e8f1fb] text-blue-900 text-xs font-semibold">
                                      <span className="w-2 h-2 rounded-full bg-teal-700" />
                                      Active on floor
                                    </span>
                                  ) : (
                                    <TimePill value={employee.last_out} tone="plain" />
                                  )}
                                </td>

                                {/* WORK DURATION */}
                                <td className="py-4 px-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                      <span
                                        className={`font-bold text-base whitespace-nowrap ${durationText}`}
                                      >
                                        {formatDuration(employee.work_min)}
                                      </span>

                                      {isHalfDay ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold whitespace-nowrap">
                                          Half Day
                                        </span>
                                      ) : (
                                        hasWork && (
                                          <span className={`text-xs font-bold ${percentText}`}>
                                            {percent}%
                                          </span>
                                        )
                                      )}
                                    </div>

                                    <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                      {hasWork && (
                                        <div
                                          className={`h-full rounded-full bg-gradient-to-r ${barFill}`}
                                          style={{ width: `${percent}%` }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* AUDIT FLAGS */}
                                <td className="py-4 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {employee.flags.is_late && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px] whitespace-nowrap">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Late
                                      </span>
                                    )}

                                    {employee.flags.excess_break && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[10px] whitespace-nowrap">
                                        <TimerOff className="w-3 h-3" />
                                        Excess Break
                                      </span>
                                    )}

                                    {employee.flags.needs_regularization && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#e0e8ff] border border-blue-200 text-blue-800 font-bold text-[10px]">
                                        <Flag className="w-3 h-3 shrink-0" />
                                        Needs Regularization
                                      </span>
                                    )}

                                    {!employee.flags.is_late &&
                                      !employee.flags.excess_break &&
                                      !employee.flags.needs_regularization &&
                                      employee.status === "PRESENT" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-300 text-slate-600 font-bold text-[10px] whitespace-nowrap">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                          Compliant
                                        </span>
                                      )}

                                    {employee.is_locked && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] whitespace-nowrap">
                                        <Lock className="w-3 h-3" />
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* OPERATIONS */}
                                <td className="py-4 px-3">
                                  <div className="flex items-center justify-end gap-1">
                                    {employee.flags.needs_regularization ? (
                                      <button
                                        type="button"
                                        onClick={() => openCorrectionForEmployee(employee)}
                                        className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-full bg-[#0a47b3] hover:bg-[#083a91] text-white font-bold text-xs text-center leading-tight shadow-sm transition-colors"
                                      >
                                        <ClipboardCheck className="w-4 h-4" />
                                        Manual In/Out
                                      </button>
                                    ) : employee.flags.excess_break ? (
                                      <button
                                        type="button"
                                        onClick={() => openCorrectionForEmployee(employee)}
                                        className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white font-bold text-xs text-center leading-tight shadow-sm transition-colors"
                                      >
                                        <PlusCircle className="w-4 h-4" />
                                        Correction
                                      </button>
                                    ) : employee.flags.is_late ? (
                                      <button
                                        type="button"
                                        onClick={() => openCorrectionForEmployee(employee)}
                                        className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold text-xs text-center leading-tight transition-colors"
                                      >
                                        <Pencil className="w-4 h-4" />
                                        Correct Punch
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openCorrectionForEmployee(employee)}
                                        className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-full bg-[#dbe7ff] hover:bg-[#c9d9ff] text-blue-700 font-bold text-xs text-center leading-tight transition-colors"
                                      >
                                        <Plus className="w-4 h-4" />
                                        Punch
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      aria-label="Audit history"
                                      title="Audit history (endpoint not connected yet)"
                                      className="shrink-0 p-1.5 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                      <History className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-12 text-center text-base text-slate-400"
                            >
                              No employees found for this date or filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {!dailyLoading && !dailyError && (
                  <div className="px-6 py-5 bg-[#f7f9fd] border-t border-[#e8eef5] flex items-center justify-between text-sm font-medium text-slate-600">
                    <span>
                      Showing {filteredEmployees.length} of {totalEmployees} employee records
                    </span>
                    <span className="font-bold text-slate-800">{formattedSelectedDate}</span>
                  </div>
                )}
              </div>

              {/* AUDIT SECTION */}

              <div className="bg-white border border-[#d5dbe1] rounded-3xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-[#1b64da]" />
                  <h2 className="text-xl font-black text-[#0f172a] tracking-tight">
                    Recent Corrections & Audit Stream
                  </h2>
                </div>

                <div className="p-6 text-center rounded-2xl bg-[#f8fafc] border border-dashed border-[#d5dbe1]">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-base font-bold text-slate-600">
                    Audit history endpoint not connected
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    A separate backend endpoint is needed to display historical
                    corrections and enable void actions here.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ==========================================
              MONTHLY INSPECTOR
          ========================================== */}

          {activeTab === "MONTHLY" && (
            <div className="space-y-6">

              {/* EMPLOYEE SELECTOR */}

              <div className="bg-white border border-[#d5dbe1] rounded-3xl p-5 lg:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Monthly Attendance Inspector
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Review an employee's attendance summary and daily records.
                    </p>
                  </div>

                  <div className="w-full md:w-80">
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      Select Employee
                    </label>

                    <select
                      value={monthlyEmployeeId}
                      onChange={(event) => {
                        setMonthlyEmployeeId(event.target.value);
                        dispatch(clearMonthlyAttendance());
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Choose an employee...</option>

                      {employees.map((employee) => (
                        <option
                          key={employee.user_id}
                          value={employee.user_id}
                        >
                          {employee.name} ({employee.emp_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {!monthlyEmployeeId && (
                <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-700">
                    Select an employee
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Choose an employee to load their monthly attendance.
                  </p>
                </div>
              )}

              {monthlyEmployeeId && monthlyLoading && (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-base font-semibold text-slate-600">
                    Loading monthly attendance...
                  </p>
                </div>
              )}

              {monthlyEmployeeId && !monthlyLoading && monthlyError && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <p className="text-base font-bold text-rose-700">
                    Unable to load monthly attendance
                  </p>
                  <p className="text-sm text-rose-600 mt-1">{monthlyError}</p>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(
                        fetchMonthlyAttendance({
                          user_id: Number(monthlyEmployeeId),
                          month: selectedMonth,
                          year: selectedYear,
                        })
                      )
                    }
                    className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold"
                  >
                    Try again
                  </button>
                </div>
              )}

              {monthlyEmployeeId && !monthlyLoading && monthlyAttendance && (
                <>
                  {/* EMPLOYEE PROFILE */}

                  <div className="bg-white border border-[#d5dbe1] rounded-3xl p-5 lg:p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Employee
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">
                          {monthlyEmployee?.name}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                          {monthlyEmployee?.emp_code} · {monthlyEmployee?.designation}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-3">
                        <p className="text-xs font-bold uppercase text-blue-600">
                          Selected Period
                        </p>
                        <p className="text-lg font-black text-blue-900 mt-1">
                          {formatMonth(selectedMonth, selectedYear)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MONTHLY TOTALS */}

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      { label: "Present", value: monthlyTotals?.present ?? 0, color: "text-emerald-600" },
                      { label: "Half Day", value: monthlyTotals?.half ?? 0, color: "text-amber-600" },
                      { label: "Absent", value: monthlyTotals?.absent ?? 0, color: "text-rose-600" },
                      { label: "Leave", value: monthlyTotals?.leave ?? 0, color: "text-violet-600" },
                      { label: "Holidays", value: monthlyTotals?.holiday ?? 0, color: "text-sky-600" },
                      { label: "Weekly Off", value: monthlyTotals?.weekly_off ?? 0, color: "text-slate-700" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {item.label}
                        </p>
                        <p className={`text-3xl font-black mt-2 ${item.color}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                      <p className="text-sm font-bold text-slate-500">
                        Insufficient Days
                      </p>
                      <p className="text-2xl font-black text-orange-600 mt-2">
                        {monthlyTotals?.insufficient ?? 0}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                      <p className="text-sm font-bold text-slate-500">
                        Late Arrivals
                      </p>
                      <p className="text-2xl font-black text-amber-600 mt-2">
                        {monthlyTotals?.late_count ?? 0}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                      <p className="text-sm font-bold text-slate-500">
                        Total Work Hours
                      </p>
                      <p className="text-2xl font-black text-blue-700 mt-2">
                        {monthlyTotals?.work_hours ?? 0} hrs
                      </p>
                    </div>
                  </div>

                  {/* CALENDAR */}

                  <div className="bg-white border border-[#d5dbe1] rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-5 lg:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-6 h-6 text-blue-600" />
                        <div>
                          <h3 className="text-xl font-black text-slate-900">
                            Attendance Calendar
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatMonth(selectedMonth, selectedYear)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-bold">
                        {[
                          ["PRESENT", "Present"],
                          ["HALF_DAY", "Half Day"],
                          ["ABSENT", "Absent"],
                          ["LEAVE", "Leave"],
                          ["HOLIDAY", "Holiday"],
                          ["WEEKLY_OFF", "Weekly Off"],
                          ["NO_RECORD", "No Record"],
                          ["UPCOMING", "Upcoming"],
                        ].map(([key, label]) => (
                          <span
                            key={key}
                            className={`px-2.5 py-1.5 rounded-lg border ${statusStyles[key]}`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 lg:p-6">
                      <div className="grid grid-cols-7 gap-2 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
                            <div
                              key={day}
                              className="text-center py-2 text-xs font-black uppercase text-slate-500"
                            >
                              {day}
                            </div>
                          )
                        )}
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {calendarCells.map((dayNumber, index) => {
                          if (!dayNumber) {
                            return <div key={`empty-${index}`} />;
                          }

                          const dateString = [
                            selectedYear,
                            String(selectedMonth).padStart(2, "0"),
                            String(dayNumber).padStart(2, "0"),
                          ].join("-");

                          const dayData = monthlyDayMap.get(dateString);
                          const status = getDayStatus(
                            dayData,
                            dateString,
                            todayDate
                          );

                          const isToday = dateString === todayDate;

                          return (
                            <div
                              key={dateString}
                              className={`min-h-[100px] sm:min-h-[120px] rounded-xl border p-2 sm:p-3 ${
                                statusStyles[status]
                              } ${
                                isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-sm sm:text-base font-black">
                                  {dayNumber}
                                </span>

                                {isToday && (
                                  <span className="text-[9px] sm:text-[10px] font-black uppercase">
                                    Today
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] sm:text-xs font-bold mt-2 leading-tight">
                                {status.replace("_", " ")}
                              </p>

                              {dayData?.summary && (
                                <p className="text-[10px] sm:text-xs font-semibold mt-1 opacity-80">
                                  {Number(
                                    dayData.summary.work_min ??
                                      dayData.summary.work_minutes ??
                                      0
                                  ) > 0
                                    ? formatDuration(
                                        Number(
                                          dayData.summary.work_min ??
                                            dayData.summary.work_minutes ??
                                            0
                                        )
                                      )
                                    : ""}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* MONTHLY DAY DETAILS */}

                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200">
                      <h3 className="text-xl font-black text-slate-900">
                        Daily Attendance Details
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Records returned by the monthly attendance API.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-4 font-bold">Date</th>
                            <th className="px-5 py-4 font-bold">Status</th>
                            <th className="px-5 py-4 font-bold">Work Duration</th>
                            <th className="px-5 py-4 font-bold">Punches</th>
                            <th className="px-5 py-4 font-bold">Sessions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-sm">
                          {monthlyDays.map((day) => {
                            const status = getDayStatus(
                              day,
                              day.date,
                              todayDate
                            );

                            const summary = day.summary as any;

                            const workMinutes = Number(
                              summary?.work_min ??
                                summary?.work_minutes ??
                                0
                            );

                            return (
                              <tr key={day.date} className="hover:bg-slate-50">
                                <td className="px-5 py-4 font-bold text-slate-800 whitespace-nowrap">
                                  {formatDate(day.date)}
                                </td>

                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex px-3 py-1.5 rounded-full border text-xs font-bold ${statusStyles[status]}`}
                                  >
                                    {status.replace("_", " ")}
                                  </span>
                                </td>

                                <td className="px-5 py-4 font-semibold text-slate-700">
                                  {summary ? formatDuration(workMinutes) : "—"}
                                </td>

                                <td className="px-5 py-4 text-slate-600">
                                  {day.punches?.length ?? 0}
                                </td>

                                <td className="px-5 py-4 text-slate-600">
                                  {day.sessions?.length ?? 0}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ==========================================
          CORRECTION MODAL
      ========================================== */}

      {isAddCorrectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-[#d5dbe1] rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1b64da]" />
                <h3 className="font-black text-lg text-[#0f172a]">
                  Add Manual Attendance Correction
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsAddCorrectionOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#eef4fa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCorrection} className="mt-5 space-y-4">
              {correctionError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  {correctionError}
                </div>
              )}

              {correctionSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                  {correctionSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">
                  Select Employee *
                </label>

                <select
                  required
                  value={newCorrection.user_id}
                  onChange={(event) =>
                    setNewCorrection({
                      ...newCorrection,
                      user_id: event.target.value,
                    })
                  }
                  className="w-full px-3.5 py-3 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#7BBDE8] focus:outline-none"
                >
                  <option value="">Choose employee...</option>

                  {employees.map((employee) => (
                    <option
                      key={employee.user_id}
                      value={employee.user_id}
                    >
                      {employee.name} ({employee.emp_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">
                  Punched Date & Time *
                </label>

                <input
                  type="datetime-local"
                  required
                  value={newCorrection.punched_at}
                  onChange={(event) =>
                    setNewCorrection({
                      ...newCorrection,
                      punched_at: event.target.value,
                    })
                  }
                  className="w-full px-3.5 py-3 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#7BBDE8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">
                  Direction *
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {(["IN", "OUT"] as CorrectionDirection[]).map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() =>
                        setNewCorrection({
                          ...newCorrection,
                          direction,
                        })
                      }
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        newCorrection.direction === direction
                          ? direction === "IN"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "bg-sky-50 border-sky-500 text-sky-700"
                          : "bg-[#f8fafc] border-[#d5dbe1] text-[#64748b]"
                      }`}
                    >
                      {direction} (Punch {direction === "IN" ? "In" : "Out"})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">
                  Mandatory Audit Reason *
                </label>

                <textarea
                  required
                  rows={3}
                  placeholder="Device offline, missed manual punch..."
                  value={newCorrection.reason}
                  onChange={(event) =>
                    setNewCorrection({
                      ...newCorrection,
                      reason: event.target.value,
                    })
                  }
                  className="w-full px-3.5 py-3 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#7BBDE8] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCorrectionOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-bold text-[#64748b] hover:bg-[#eef4fa]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={correctionLoading}
                  className="px-5 py-3 rounded-xl text-sm font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-sm disabled:opacity-50"
                >
                  {correctionLoading
                    ? "Saving..."
                    : "Save & Recompute Day"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}