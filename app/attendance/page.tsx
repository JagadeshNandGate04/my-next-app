"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store/store";
import {
  clearRequestMessages,
  fetchAdminLeaveRequests,
  fetchAdminPermissionRequests,
  fetchAdminRegularizationRequests,
  type DecisionAction,
} from "@/app/store/requests/requestSlice";
import AttendanceRequestModal from "./AttendanceRequestModal";
import LopAdjustmentModal, { type LopAdjustmentSelection } from "./LopAdjustmentModal";
import { requestTypeLabel, requestsForDay, validateRequestDates, type AttendanceRequest } from "@/app/store/attendance/attendanceRequests";

import {
  fetchDailyAttendance,
  fetchMonthlyAttendance,
  addAttendanceCorrection,
  clearCorrectionFeedback,
  clearMonthlyAttendance,
  type AttendanceDay,
  type AttendanceFlags,
  type AttendanceLopValues,
  type EmployeeAttendance,
} from "@/app/store/attendance/attendanceSlice";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
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
  ListFilter,
  Pencil,
  ClipboardCheck,
  PlusCircle,
} from "lucide-react";

// --------------------------------------------------
// THEME COLOURS
// --------------------------------------------------

const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

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

const formatLop = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "—";
  if (
    (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value.trim())) ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  )
    return "Invalid value";
  return `${Number(value)} ${Number(value) === 1 ? "day" : "days"}`;
};

const positiveLop = (value: number | string | null | undefined) => {
  const parsed =
    typeof value === "number" || (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim()))
      ? Number(value)
      : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// --------------------------------------------------
// COMPACT HELPER COMPONENTS
// --------------------------------------------------

function LopDetails({
  values,
  onAdjust,
}: {
  values?: AttendanceLopValues | null;
  onAdjust: (currentLop: number) => void;
}) {
  if (!values) return <span className="text-slate-400">—</span>;
  const { lop_value, calculated_lop_value, adjusted_lop_value } = values;
  const numericLop = positiveLop(lop_value);
  return (
    <div className="min-w-[6rem] text-base">
      <div className="flex items-center gap-1.5">
        <span className="font-bold tabular-nums text-slate-800">{formatLop(lop_value)}</span>
        {numericLop !== null && (
          <button
            type="button"
            onClick={() => onAdjust(numericLop)}
            aria-label="Adjust LOP"
            title="Adjust LOP"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Pencil aria-hidden="true" className="h-3 w-3" />
          </button>
        )}
      </div>
      {/* {calculated_lop_value != null && (
        <span className="mt-0.5 block text-sm text-slate-600">
          Calc: {formatLop(calculated_lop_value)}
        </span>
      )}
      {adjusted_lop_value != null && (
        <span className="mt-0.5 block text-sm font-semibold text-blue-700">
          Adj: {formatLop(adjusted_lop_value)}
        </span>
      )} */}
    </div>
  );
}

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
  const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month, 0).getDate();
  return { firstDay, totalDays };
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

// calendar / status colours
const statusStyles: Record<string, string> = {
  PRESENT: "bg-[#7BBDE8] text-[#0f172a] border-[#7BBDE8]",
  HALF_DAY: "bg-[#bfe0f5] text-[#0f172a] border-[#a5d3ef]",
  ABSENT: "bg-[#1b64da] text-white border-[#1b64da]",
  LEAVE: "bg-[#dbe7ff] text-blue-800 border-blue-200",
  HOLIDAY: "bg-[#e8f1fa] text-[#0f172a] border-[#cfe3f5]",
  WEEKLY_OFF: "bg-slate-200 text-slate-700 border-slate-300",
  INSUFFICIENT: "bg-white text-[#1b64da] border-[#1b64da]",
  NO_RECORD: "bg-slate-50 text-slate-500 border-slate-200",
  UPCOMING: "bg-blue-50 text-blue-700 border-blue-200",
};

const calendarCellStyles: Record<string, string> = {
  PRESENT: "border-[#9ccfee] bg-[#dceffa]",
  HALF_DAY: "border-[#b2d8f1] bg-[#e6f4fc]",
  ABSENT: "border-[#a9c5f8] bg-[#dce8ff]",
  LEAVE: "border-blue-200 bg-[#e5edff]",
  HOLIDAY: "border-sky-200 bg-[#e7f6fc]",
  WEEKLY_OFF: "border-slate-200 bg-slate-100",
  INSUFFICIENT: "border-blue-300 bg-[#edf4ff]",
};

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
  return clock ? `${clock.hour12}:${clock.mm}:${clock.ss} ${clock.meridiem}` : null;
};

const formatShort12 = (value: string | null) => {
  const clock = parseClock(value);
  return clock ? `${clock.hour12}:${clock.mm} ${clock.meridiem}` : null;
};

const avatarGradients = [
  "from-[#7BBDE8] to-[#1b64da]",
  "from-[#1b64da] to-[#0a47b3]",
  "from-[#a9d6f2] to-[#4aa3df]",
  "from-[#5aa6e3] to-[#2f78e6]",
  "from-[#6fb5e6] to-[#0a47b3]",
];

const getAvatarGradient = (userId: number | string) => {
  const index = Math.abs(Number(userId)) % avatarGradients.length;
  return avatarGradients[Number.isNaN(index) ? 0 : index];
};

function TimePill({ value, tone }: { value: string | null; tone: "late" | "live" | "plain" }) {
  if (!value) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 font-mono text-sm font-bold text-slate-600 whitespace-nowrap">
        --:--:--
      </span>
    );
  }
  const wrapper =
    tone === "late"
      ? "bg-[#1b64da] border-[#1b64da] text-white"
      : "bg-[#eaf4fc] border-[#d6e8f7] text-slate-900";

  const icon =
    tone === "late" ? "text-white" : tone === "live" ? "text-[#1b64da]" : "text-slate-500";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-sm font-bold whitespace-nowrap ${wrapper}`}
    >
      <Clock className={`w-3 h-3 shrink-0 ${icon}`} />
      {formatClock12(value) ?? formatPunchTime(value)}
    </span>
  );
}

function CorrectionButton({
  flags,
  onClick,
  date,
  manual = false,
}: {
  flags?: Partial<AttendanceFlags> | null;
  onClick: () => void;
  date?: string;
  manual?: boolean;
}) {
  const config =
    manual || flags?.needs_regularization
      ? {
          label: "Manual In/Out",
          Icon: ClipboardCheck,
          color: "bg-[#0a47b3] text-white shadow-sm hover:bg-[#083a91]",
        }
      : flags?.excess_break
        ? {
            label: "Correction",
            Icon: PlusCircle,
            color: "bg-[#1b64da] text-white shadow-sm hover:bg-[#1552b5]",
          }
        : flags?.is_late
          ? {
              label: "Correct Punch",
              Icon: Pencil,
              color: "border border-[#7BBDE8] bg-[#bfe0f5] text-[#0a47b3] hover:bg-[#a9d6f2]",
            }
          : { label: "Punch", Icon: Plus, color: "bg-[#dbe7ff] text-blue-700 hover:bg-[#c9d9ff]" };

  const { Icon } = config;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={date ? `${config.label} for ${formatDate(date)}` : undefined}
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </button>
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

  const [selectedDate, setSelectedDate] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [dateInitialized, setDateInitialized] = useState(false);

  const [activeTab, setActiveTab] = useState<"DAILY" | "MONTHLY">("DAILY");

  const [filterRoster, setFilterRoster] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [monthlyEmployeeId, setMonthlyEmployeeId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [monthlyInitialized, setMonthlyInitialized] = useState(false);
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestReload, setRequestReload] = useState(0);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [lopSelection, setLopSelection] = useState<LopAdjustmentSelection | null>(null);
  const [lopNotice, setLopNotice] = useState<string | null>(null);

  const [isAddCorrectionOpen, setIsAddCorrectionOpen] = useState(false);
  const [correctionValidationError, setCorrectionValidationError] = useState("");

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

  useEffect(() => {
    if (!dateInitialized || !selectedDate) return;
    dispatch(fetchDailyAttendance(selectedDate));
  }, [dispatch, selectedDate, dateInitialized]);

  const employees: EmployeeAttendance[] = dailyAttendance?.employees ?? [];
  const totalEmployees = dailyAttendance?.total ?? employees.length;

  useEffect(() => {
    if (activeTab !== "MONTHLY" || !monthlyInitialized || !monthlyEmployeeId) {
      return;
    }
    dispatch(
      fetchMonthlyAttendance({
        user_id: Number(monthlyEmployeeId),
        month: selectedMonth,
        year: selectedYear,
      })
    );
  }, [dispatch, activeTab, monthlyInitialized, monthlyEmployeeId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab !== "MONTHLY" || !monthlyEmployeeId) return;
    let cancelled = false;
    const loadRequests = async () => {
      setRequestLoading(true);
      setRequestError(null);
      setAttendanceRequests([]);
      try {
        const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
        const results = await Promise.all(
          statuses.map(async (status) => {
            const [leaves, permissions, regularizations] = await Promise.all([
              dispatch(fetchAdminLeaveRequests({ status })),
              dispatch(fetchAdminPermissionRequests({ status })),
              dispatch(fetchAdminRegularizationRequests({ status })),
            ]);
            return [
              ...leaves.data.requests.map((request): AttendanceRequest => ({ type: "leave", request })),
              ...permissions.data.requests.map((request): AttendanceRequest => ({ type: "permission", request })),
              ...regularizations.data.requests.map((request): AttendanceRequest => ({ type: "regularization", request })),
            ];
          })
        );
        if (!cancelled) {
          const requests = results.flat();
          validateRequestDates(requests);
          setAttendanceRequests(requests);
        }
      } catch (error) {
        if (!cancelled) {
          setRequestError(
            error instanceof Error ? error.message : "Unable to load attendance requests."
          );
        }
      } finally {
        if (!cancelled) setRequestLoading(false);
      }
    };
    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, [dispatch, activeTab, monthlyEmployeeId, requestReload]);

  const stats = useMemo(() => {
    const liveIn = employees.filter((employee) => employee.live_status === "IN").length;
    const present = employees.filter((employee) => employee.status === "PRESENT").length;
    const absent = employees.filter((employee) => employee.status === "ABSENT").length;
    const late = employees.filter((employee) => employee.flags?.is_late).length;
    const regularization = employees.filter((employee) => employee.flags?.needs_regularization).length;
    const excessBreak = employees.filter((employee) => employee.flags?.excess_break).length;
    const leave = employees.filter((employee) => employee.status === "LEAVE").length;
    const halfDay = employees.filter((employee) => employee.status === "HALF_DAY").length;
    const coverage = totalEmployees > 0 ? ((liveIn / totalEmployees) * 100).toFixed(1) : "0.0";

    return { liveIn, present, absent, late, regularization, excessBreak, leave, halfDay, coverage };
  }, [employees, totalEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(query) ||
        employee.emp_code.toLowerCase().includes(query) ||
        employee.designation.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filterRoster === "LIVE_IN") return employee.live_status === "IN";
      if (filterRoster === "LATE") return employee.flags?.is_late;
      if (filterRoster === "REGULARIZATION") return employee.flags?.needs_regularization;
      if (filterRoster === "ABSENT") return employee.status === "ABSENT";
      return true;
    });
  }, [employees, filterRoster, searchQuery]);

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
    setNewCorrection((previous) => ({ ...previous, punched_at: `${updatedDate}T09:00` }));
  };

  const selectToday = () => {
    setSelectedDate(todayDate);
    setNewCorrection((previous) => ({ ...previous, punched_at: `${todayDate}T09:00` }));
  };

  const formattedSelectedDate = formatDate(selectedDate);
  const isCurrentDate = selectedDate === todayDate;

  const changeMonth = (direction: number) => {
    const date = new Date(selectedYear, selectedMonth - 1 + direction, 1);
    setSelectedMonth(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
  };

  const selectCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const monthlyDays = useMemo<AttendanceDay[]>(() => monthlyAttendance?.days ?? [], [monthlyAttendance?.days]);
  const monthlyTotals = monthlyAttendance?.totals;

  const monthlyDayMap = useMemo(() => {
    const map = new Map<string, AttendanceDay>();
    monthlyDays.forEach((day) => map.set(day.date, day));
    return map;
  }, [monthlyDays]);

  const { firstDay, totalDays } = getMonthDays(selectedMonth, selectedYear);

  const monthlyTableDays = useMemo(() => {
    const days: { date: string; day: AttendanceDay | undefined }[] = monthlyDays.map((day) => ({
      date: day.date,
      day,
    }));
    const existingDates = new Set(monthlyDays.map((day) => day.date.slice(0, 10)));

    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
      const date = [
        selectedYear,
        String(selectedMonth).padStart(2, "0"),
        String(dayNumber).padStart(2, "0"),
      ].join("-");
      if (!existingDates.has(date) && requestsForDay(attendanceRequests, monthlyEmployeeId, date).length > 0) {
        days.push({ date, day: undefined });
      }
    }

    return days.length === monthlyDays.length ? days : days.sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlyDays, monthlyEmployeeId, attendanceRequests, selectedMonth, selectedYear, totalDays]);

  const calendarCells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ];

  const monthlyEmployee = monthlyAttendance?.employee;
  const selectedDayRequests = requestDate
    ? requestsForDay(attendanceRequests, monthlyEmployeeId, requestDate)
    : [];

  const handleRequestDecision = async (item: AttendanceRequest, action: DecisionAction) => {
    setRequestDate(null);
    setAttendanceRequests((previous) =>
      previous.filter(
        (candidate) =>
          candidate.type !== item.type || String(candidate.request.id) !== String(item.request.id)
      )
    );
    setRequestNotice(`${requestTypeLabel(item.type)} request ${action === "APPROVE" ? "approved" : "rejected"}.`);
    dispatch(clearRequestMessages());
    setRequestReload((value) => value + 1);
    const [daily, monthly] = await Promise.all([
      dispatch(fetchDailyAttendance(selectedDate)),
      dispatch(
        fetchMonthlyAttendance({
          user_id: Number(monthlyEmployeeId),
          month: selectedMonth,
          year: selectedYear,
        })
      ),
    ]);
    if (!daily || !monthly) {
      setRequestNotice(
        `${requestTypeLabel(item.type)} request ${
          action === "APPROVE" ? "approved" : "rejected"
        }, but attendance could not be fully refreshed. Please retry the attendance load.`
      );
    }
  };

  const handleLopSaved = async () => {
    setLopSelection(null);
    setLopNotice("LOP adjustment saved. Refreshing attendance...");
    const refreshes: Promise<unknown>[] = [dispatch(fetchDailyAttendance(selectedDate))];
    if (monthlyEmployeeId) {
      refreshes.push(
        dispatch(
          fetchMonthlyAttendance({
            user_id: Number(monthlyEmployeeId),
            month: selectedMonth,
            year: selectedYear,
          })
        )
      );
    }
    const results = await Promise.all(refreshes);
    setLopNotice(
      results.every(Boolean)
        ? "LOP adjustment saved successfully."
        : "LOP adjustment saved, but attendance could not be fully refreshed. Please reload attendance."
    );
  };

  const handleAddCorrection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newCorrection.user_id || !newCorrection.punched_at || !newCorrection.reason.trim()) {
      setCorrectionValidationError("Select an employee, date and time, and enter an audit reason.");
      return;
    }

    setCorrectionValidationError("");

    try {
      await dispatch(
        addAttendanceCorrection({
          user_id: Number(newCorrection.user_id),
          punched_at: newCorrection.punched_at,
          direction: newCorrection.direction,
          reason: newCorrection.reason.trim(),
        })
      );

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

  const openCorrection = (userId: string, date: string) => {
    dispatch(clearCorrectionFeedback());
    setCorrectionValidationError("");
    setNewCorrection({
      user_id: userId,
      punched_at: `${date}T09:00`,
      direction: "IN",
      reason: "",
    });
    setIsAddCorrectionOpen(true);
  };

  const openCorrectionForEmployee = (employee: (typeof employees)[number]) => {
    openCorrection(String(employee.user_id), selectedDate);
  };

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
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!dateInitialized || !monthlyInitialized) {
    return (
      <div className="min-h-screen bg-[#f0f6fa]">
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1b64da] mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Initializing attendance...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-[#1e293b] font-sans antialiased">
      <main className="flex-1 min-w-0 py-4 md:py-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1700px] space-y-6 px-3 sm:px-5 lg:px-6">
          {/* HEADER */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef4fa] border border-[#d5dbe1] text-xs font-bold tracking-wide text-[#64748b] uppercase mb-2">
                <Lock className="w-3.5 h-3.5 text-[#1b64da]" />
                Attendance Operations
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-[#0f172a] tracking-tight">
                Attendance Operations
              </h1>
              <p className="text-sm font-medium text-[#64748b] mt-1">
                Employee attendance, biometric punches and attendance corrections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {activeTab === "DAILY" ? (
                <div className="flex items-center bg-white border border-[#d5dbe1] rounded-2xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => changeDate(-1)}
                    className="p-2 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 font-bold text-sm text-[#0f172a]">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#1b64da]" />
                    <span>{formattedSelectedDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => changeDate(1)}
                    className="p-2 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Next day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={selectToday}
                    className={`ml-1 px-3 py-1.5 text-sm font-bold rounded-xl ${
                      isCurrentDate ? "bg-[#1b64da] text-white" : "bg-[#eef4fa] text-[#1b64da] hover:bg-[#dbeafe]"
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
                    className="p-2 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-bold text-slate-800 min-w-[140px] text-center">
                    {formatMonth(selectedMonth, selectedYear)}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-[#f5faff] rounded-xl text-[#64748b]"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={selectCurrentMonth}
                    className="ml-1 px-3 py-1.5 text-sm font-bold rounded-xl bg-[#eef4fa] text-[#1b64da] hover:bg-[#dbeafe]"
                  >
                    Current
                  </button>
                </div>
              )}

              {/* TAB TOGGLE + MANUAL BUTTON ON SAME LINE */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-[#d5dbe1] rounded-2xl p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setActiveTab("DAILY")}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeTab === "DAILY" ? "bg-[#1b64da] text-white" : "text-[#64748b] hover:text-slate-800"
                    }`}
                  >
                    Daily Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("MONTHLY")}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeTab === "MONTHLY" ? "bg-[#1b64da] text-white" : "text-[#64748b] hover:text-slate-800"
                    }`}
                  >
                    Monthly Attendance
                  </button>
                </div>

                {activeTab === "DAILY" && (
                  <button
                    type="button"
                    onClick={() => openCorrection("", selectedDate)}
                    className="inline-flex h-10 items-center gap-1.5 px-4 bg-[#1b64da] hover:bg-[#1552b5] text-white text-sm font-bold rounded-2xl shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Manual Punch
                  </button>
                )}
              </div>
            </div>
          </div>

          {lopNotice && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-800">
              <span>{lopNotice}</span>
              <button type="button" onClick={() => setLopNotice(null)} aria-label="Dismiss LOP message" className="rounded-lg p-1 hover:bg-blue-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ==========================================
              DAILY BOARD
          ========================================== */}

          {activeTab === "DAILY" && (
            <>
              {/* DAILY KPI CARDS */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                  { title: "Total Employees", value: totalEmployees, bg: SKY_LIGHT, text: INK, muted: "text-black/40", Icon: UserCheck },
                  { title: "Present / Live", value: stats.liveIn, bg: SKY, text: INK, muted: "text-black/40", Icon: Users },
                  { title: "Absent", value: stats.absent, bg: BLUE, text: "#ffffff", muted: "text-white/60", Icon: AlertTriangle },
                  { title: "Late Arrivals", value: stats.late, bg: SKY_LIGHT, text: INK, muted: "text-black/40", Icon: Clock },
                  { title: "Needs Correction", value: stats.regularization, bg: SKY, text: INK, muted: "text-black/40", Icon: AlertTriangle },
                  { title: "Payroll Cycle", value: "Date-specific", bg: BLUE, text: "#ffffff", muted: "text-white/60", Icon: Lock },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="min-h-[120px] rounded-2xl p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                    style={{ backgroundColor: item.bg, color: item.text }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide opacity-70 leading-tight">
                        {item.title}
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-600">
                        <item.Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="text-xl font-black leading-tight md:text-2xl">
                      {dailyLoading ? "—" : item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* DAILY ROSTER (COMPACT) */}
              <div className="bg-white border border-[#e6edf4] rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 bg-[#f7f9fd] border-b border-[#e8eef5] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: "ALL", label: `All Roster (${totalEmployees})` },
                      { key: "LIVE_IN", label: `Live In (${stats.liveIn})` },
                      { key: "LATE", label: `Late (${stats.late})` },
                      { key: "REGULARIZATION", label: `Needs Regularization (${stats.regularization})` },
                      { key: "ABSENT", label: `Absent (${stats.absent})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterRoster(tab.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          filterRoster === tab.key
                            ? "bg-[#1b64da] text-white shadow-sm"
                            : "bg-[#eaf4fc] text-slate-600 hover:bg-[#dcecf9]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <ListFilter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search name, ID, role..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-full bg-white border border-[#e2e8f0] text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#7BBDE8] focus:ring-1 focus:ring-[#7BBDE8]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={!employees.length}
                      aria-label="Export attendance"
                      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-[#eaf4fc] hover:bg-[#dcecf9] text-[#1b64da] shadow-sm disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => dispatch(fetchDailyAttendance(selectedDate))}
                      disabled={dailyLoading}
                      aria-label="Refresh attendance"
                      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-[#eaf4fc] hover:bg-[#dcecf9] text-[#1b64da] shadow-sm disabled:opacity-40"
                    >
                      <RefreshCw className={`w-4 h-4 ${dailyLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {dailyLoading && (
                  <div className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#1b64da] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#64748b]">Fetching attendance records...</p>
                  </div>
                )}

                {!dailyLoading && dailyError && (
                  <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-bold text-rose-700">Unable to load attendance</p>
                    <p className="text-xs text-rose-600 mt-1">{dailyError}</p>
                    <button
                      type="button"
                      onClick={() => dispatch(fetchDailyAttendance(selectedDate))}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!dailyLoading && !dailyError && (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[1400px] border-collapse text-left">
                      <caption className="sr-only">Daily attendance roster for {formattedSelectedDate}</caption>
                      <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[16%]" />
                        <col className="w-[11%]" />
                        <col className="w-[12%]" />
                        <col className="w-[14%]" />
                        <col className="w-[12%]" />
                        <col className="w-[13%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-[#d6e8f7] bg-[#eaf4fc] text-sm font-bold uppercase tracking-wide text-slate-700">
                          <th scope="col" className="px-3 py-2.5">Employee</th>
                          <th scope="col" className="px-3 py-2.5">Status &amp; Live Feed</th>
                          <th scope="col" className="px-3 py-2.5">First In</th>
                          <th scope="col" className="px-3 py-2.5">Last Out</th>
                          <th scope="col" className="px-3 py-2.5">Work Duration</th>
                          <th scope="col" className="px-3 py-2.5">LOP</th>
                          <th scope="col" className="sticky right-0 z-10 bg-[#eaf4fc] px-3 py-2.5 text-right">Operations</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#eef1f6] text-base">
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((employee) => {
                            const isLive = employee.live_status === "IN";
                            const isLate = Boolean(employee.flags.is_late);
                            const isHalfDay = employee.status === "HALF_DAY";
                            const hasWork = employee.work_min > 0;
                            const hasFirstIn = Boolean(employee.first_in);
                            const noPunch = !hasFirstIn && employee.status === "ABSENT";

                            const percent = Math.min(100, Math.round((employee.work_min / 480) * 100));

                            const durationText = !hasWork
                              ? "text-slate-600"
                              : isHalfDay
                                ? "text-[#0a47b3]"
                                : isLate
                                  ? "text-slate-800"
                                  : "text-[#1b64da]";

                            const barFill = isHalfDay
                              ? "from-[#7BBDE8] to-[#bfe0f5]"
                              : isLate
                                ? "from-[#0a47b3] to-[#1b64da]"
                                : "from-[#1b64da] to-[#7BBDE8]";

                            const percentText = isLate ? "text-[#0a47b3]" : "text-[#1b64da]";

                            return (
                              <tr
                                key={employee.user_id}
                                className="group bg-white transition-colors hover:bg-[#f5faff]"
                              >
                                {/* EMPLOYEE */}
                                <td className="px-3 py-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div
                                      className={`w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br ${getAvatarGradient(
                                        employee.user_id
                                      )} text-white font-black flex items-center justify-center text-xs shadow-sm`}
                                    >
                                      {employee.name.slice(0, 2).toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="truncate text-base font-bold text-slate-900" title={employee.name}>
                                        {employee.name}
                                      </div>
                                      <div className="mt-0.5 flex min-w-0 items-center gap-1 text-sm font-medium text-slate-600">
                                        <span className="shrink-0 rounded bg-[#eaf4fc] px-1 py-0.5 font-bold text-blue-700">
                                          {employee.emp_code}
                                        </span>
                                        <span className="truncate" title={employee.designation}>{employee.designation}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* STATUS & LIVE FEED */}
                                <td className="px-3 py-2">
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#e1f1fb] text-[#0a47b3] border border-[#7BBDE8]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#1b64da] animate-pulse" />
                                      <span className="text-sm leading-tight">
                                        <span className="block font-bold">IN OFFICE</span>
                                        {formatShort12(employee.first_in) && (
                                          <span className="block font-semibold">({formatShort12(employee.first_in)})</span>
                                        )}
                                      </span>
                                    </span>
                                  ) : noPunch ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1b64da] text-white border border-[#1b64da]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                      <span className="text-sm leading-tight font-bold">NO PUNCH</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#eaf4fc] text-slate-600 border border-[#d6e8f7]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                      <span className="text-sm leading-tight">
                                        {employee.last_out ? (
                                          <>
                                            <span className="block font-semibold">LOGGED OUT</span>
                                            <span className="block font-medium">({formatShort12(employee.last_out)})</span>
                                          </>
                                        ) : (
                                          <span className="block font-semibold">{employee.status.replace("_", " ")}</span>
                                        )}
                                      </span>
                                    </span>
                                  )}
                                </td>

                                {/* FIRST IN */}
                                <td className="px-3 py-2">
                                  <TimePill value={employee.first_in} tone={isLate ? "late" : isLive ? "live" : "plain"} />
                                </td>

                                {/* LAST OUT */}
                                <td className="px-3 py-2">
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#bfe0f5] text-[#0a47b3] text-sm font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#1b64da]" />
                                      Active
                                    </span>
                                  ) : (
                                    <TimePill value={employee.last_out} tone="plain" />
                                  )}
                                </td>

                                {/* WORK DURATION */}
                                <td className="px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                      <span className={`font-bold text-base whitespace-nowrap ${durationText}`}>
                                        {formatDuration(employee.work_min)}
                                      </span>

                                      {isHalfDay ? (
                                        <span className="px-1.5 py-0.5 rounded-full bg-[#bfe0f5] text-[#0a47b3] text-sm font-bold whitespace-nowrap">
                                          Half
                                        </span>
                                      ) : (
                                        hasWork && (
                                          <span className={`text-sm font-bold ${percentText}`}>
                                            {percent}%
                                          </span>
                                        )
                                      )}
                                    </div>

                                    <div className="mt-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                      {hasWork && (
                                        <div
                                          className={`h-full rounded-full bg-gradient-to-r ${barFill}`}
                                          style={{ width: `${percent}%` }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-2">
                                  <LopDetails values={employee} onAdjust={(currentLop) => {
                                    setLopNotice(null);
                                    setLopSelection({ userId: String(employee.user_id), employeeName: employee.name, date: selectedDate, currentLop });
                                  }} />
                                </td>

                                {/* OPERATIONS */}
                                <td className="sticky right-0 bg-white px-3 py-2 group-hover:bg-[#f5faff]">
                                  <div className="flex items-center justify-end gap-1">
                                    <CorrectionButton flags={employee.flags} onClick={() => openCorrectionForEmployee(employee)} />
                                    <button
                                      type="button"
                                      aria-label="Audit history"
                                      title="Audit history (endpoint not connected yet)"
                                      className="shrink-0 p-1 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                                    >
                                      <History className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                              No employees found for this date or filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {!dailyLoading && !dailyError && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8eef5] bg-[#f7f9fd] px-4 py-2.5 text-sm font-medium text-slate-600">
                    <span>Showing {filteredEmployees.length} of {totalEmployees} employee records</span>
                    <span className="font-bold text-slate-800">{formattedSelectedDate}</span>
                  </div>
                )}
              </div>

              {/* AUDIT SECTION */}
              <div className="bg-white border border-[#d5dbe1] rounded-2xl p-5 lg:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-[#1b64da]" />
                  <h2 className="text-lg font-black text-[#0f172a] tracking-tight">Recent Corrections & Audit Stream</h2>
                </div>
                <div className="p-5 text-center rounded-xl bg-[#f8fafc] border border-dashed border-[#d5dbe1]">
                  <History className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">Audit history endpoint not connected</p>
                  <p className="text-xs text-slate-400 mt-1">
                    A separate backend endpoint is needed to display historical corrections and enable void actions here.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ==========================================
              MONTHLY INSPECTOR
          ========================================== */}

          {activeTab === "MONTHLY" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#d5dbe1] rounded-2xl px-4 py-3 lg:px-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Monthly Attendance Inspector</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Review an employee&apos;s attendance summary and daily records.</p>
                  </div>
                  <div className="w-full md:w-72">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Employee</label>
                    <select
                      value={monthlyEmployeeId}
                      onChange={(event) => {
                        setMonthlyEmployeeId(event.target.value);
                        dispatch(clearMonthlyAttendance());
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map((employee) => (
                        <option key={employee.user_id} value={employee.user_id}>
                          {employee.name} ({employee.emp_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {monthlyEmployeeId && !monthlyLoading && monthlyAttendance && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{monthlyEmployee?.name}</h3>
                        <p className="text-xs text-slate-500">{monthlyEmployee?.emp_code} · {monthlyEmployee?.designation}</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">{formatMonth(selectedMonth, selectedYear)}</p>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
                      {[
                        { label: "Present", value: monthlyTotals?.present ?? 0, color: "border-[#9ccfee] bg-[#bfe0f5] text-[#073a77]" },
                        { label: "Half Day", value: monthlyTotals?.half ?? 0, color: "border-[#9dd5ed] bg-[#d0ecf9] text-[#075477]" },
                        { label: "Absent", value: monthlyTotals?.absent ?? 0, color: "border-[#1b64da] bg-[#1b64da] text-white" },
                        { label: "Leave", value: monthlyTotals?.leave ?? 0, color: "border-blue-200 bg-[#cbdcff] text-blue-900" },
                        { label: "Holidays", value: monthlyTotals?.holiday ?? 0, color: "border-sky-200 bg-[#d1edf9] text-sky-900" },
                        { label: "Weekly Off", value: monthlyTotals?.weekly_off ?? 0, color: "border-slate-300 bg-slate-200 text-slate-800" },
                        { label: "Insufficient", value: monthlyTotals?.insufficient ?? 0, color: "border-blue-300 bg-[#dce8ff] text-[#0a47b3]" },
                        { label: "Late Arrivals", value: monthlyTotals?.late_count ?? 0, color: "border-[#a5d3ef] bg-[#cce8f8] text-[#073a77]" },
                        { label: "Total Hours", value: `${monthlyTotals?.work_hours ?? 0} hrs`, color: "border-[#0a47b3] bg-[#0a47b3] text-white" },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-lg border px-2.5 py-1.5 ${item.color}`}>
                          <dt className="text-xs font-semibold">{item.label}</dt>
                          <dd className="mt-0.5 text-base font-bold tabular-nums">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>

              {requestNotice && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-800">
                  <span>{requestNotice}</span>
                  <button type="button" onClick={() => setRequestNotice(null)} aria-label="Dismiss request message" className="rounded-lg p-1 hover:bg-blue-100"><X className="h-4 w-4" /></button>
                </div>
              )}

              {!monthlyEmployeeId && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-slate-700">Select an employee</h3>
                  <p className="text-xs text-slate-500 mt-1">Choose an employee to load their monthly attendance.</p>
                </div>
              )}

              {monthlyEmployeeId && monthlyLoading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Loading monthly attendance...</p>
                </div>
              )}

              {monthlyEmployeeId && !monthlyLoading && monthlyError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-rose-700">Unable to load monthly attendance</p>
                  <p className="text-xs text-rose-600 mt-1">{monthlyError}</p>
                  <button
                    type="button"
                    onClick={() => dispatch(fetchMonthlyAttendance({ user_id: Number(monthlyEmployeeId), month: selectedMonth, year: selectedYear }))}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                  >
                    Try again
                  </button>
                </div>
              )}

              {monthlyEmployeeId && !monthlyLoading && monthlyAttendance && (
                <>
                  {/* CALENDAR */}
                  <div className="bg-white border border-[#d5dbe1] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 lg:px-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Attendance Calendar</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{formatMonth(selectedMonth, selectedYear)}</p>
                          <p className="mt-1 text-xs text-slate-500 sm:hidden">Swipe to see the full week</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs font-medium text-slate-600">
                        {[
                          ["PRESENT", "Present"],
                          ["HALF_DAY", "Half Day"],
                          ["ABSENT", "Absent"],
                          ["LEAVE", "Leave"],
                          ["HOLIDAY", "Holiday"],
                          ["WEEKLY_OFF", "Weekly Off"],
                          ["INSUFFICIENT", "Insufficient"],
                          ["NO_RECORD", "No Record"],
                          ["UPCOMING", "Upcoming"],
                        ].map(([key, label]) => (
                          <span key={key} className={`inline-flex rounded border px-1.5 py-0.5 font-bold ${statusStyles[key]}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto px-4 pb-3 lg:px-5">
                      <div className="min-w-[840px]">
                        <div className="grid grid-cols-7 gap-1.5 pb-1.5 pt-3">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="rounded-full bg-[#eef4fa] py-1.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                              {day}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5">
                          {calendarCells.map((dayNumber, index) => {
                            if (!dayNumber) return <div key={`empty-${index}`} />;

                            const dateString = [selectedYear, String(selectedMonth).padStart(2, "0"), String(dayNumber).padStart(2, "0")].join("-");
                            const dayData = monthlyDayMap.get(dateString);
                            const status = getDayStatus(dayData, dateString, todayDate);
                            const isToday = dateString === todayDate;
                            const isWeekend = index % 7 >= 5;

                            return (
                              <div
                                key={dateString}
                                className={`flex min-h-[80px] flex-col rounded-xl border p-2 ${
                                  calendarCellStyles[status] ?? (isWeekend ? "border-transparent bg-[#f5faff]" : "border-[#eef2f7] bg-white")
                                } ${isToday ? "ring-2 ring-[#1b64da] ring-offset-1" : ""}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-black ${isToday ? "bg-[#1b64da] text-white" : "text-slate-800"}`}>
                                    {String(dayNumber).padStart(2, "0")}
                                  </span>
                                  {isToday && <span className="text-xs font-bold uppercase text-blue-700">Today</span>}
                                </div>
                                <p className={`mt-1.5 rounded border px-1.5 py-0.5 text-xs font-semibold leading-tight ${statusStyles[status]}`}>
                                  {status.replace("_", " ")}
                                </p>
                                {dayData?.summary && (
                                  <p className="mt-1 px-1.5 text-xs font-medium text-slate-500">
                                    {Number(dayData.summary.work_min ?? dayData.summary.work_minutes ?? 0) > 0
                                      ? formatDuration(Number(dayData.summary.work_min ?? dayData.summary.work_minutes ?? 0))
                                      : ""}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MONTHLY DAY DETAILS */}
                  <div className="overflow-hidden rounded-xl border border-[#d5dbe1] bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 lg:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf4fc] text-[#1b64da]">
                          <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Daily Attendance Details</h3>
                          <p className="text-xs text-slate-500">Daily records for {formatMonth(selectedMonth, selectedYear)}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#eef4fa] px-2.5 py-1 text-xs font-bold text-slate-600">
                        {monthlyTableDays.length} {monthlyTableDays.length === 1 ? "day" : "days"}
                      </span>
                    </div>

                    {requestLoading && <p role="status" className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">Loading attendance requests...</p>}
                    {requestError && (
                      <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                        <span>Unable to load attendance requests: {requestError}</span>
                        <button type="button" onClick={() => setRequestReload((value) => value + 1)} className="font-bold underline underline-offset-2">Try again</button>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px] text-left text-xs">
                        <caption className="sr-only">Daily attendance records for {formatMonth(selectedMonth, selectedYear)}</caption>
                        <thead>
                          <tr className="border-b border-[#d6e8f7] bg-[#eaf4fc] text-xs uppercase tracking-wider text-slate-600">
                            <th scope="col" className="px-4 py-2 font-bold">Date</th>
                            <th scope="col" className="px-4 py-2 font-bold">Status</th>
                            <th scope="col" className="px-4 py-2 font-bold">First In</th>
                            <th scope="col" className="px-4 py-2 font-bold">Last Out</th>
                            <th scope="col" className="px-4 py-2 font-bold">Work Duration</th>
                            <th scope="col" className="px-4 py-2 font-bold">LOP (Days)</th>
                            <th scope="col" className="px-4 py-2 text-center font-bold">Punches</th>
                            <th scope="col" className="px-4 py-2 text-center font-bold">Sessions</th>
                            <th scope="col" className="sticky right-0 z-10 bg-[#eaf4fc] px-4 py-2 text-right font-bold">Action</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {monthlyTableDays.length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-6 text-center text-xs text-slate-500">No daily records available for this month.</td>
                            </tr>
                          )}
                          {monthlyTableDays.map(({ date, day }) => {
                            const status = getDayStatus(day, date, todayDate);
                            const summary = day?.summary;
                            const firstIn = summary?.first_in?.trim() || null;
                            const lastOut = summary?.last_out?.trim() || null;
                            const lopValues = day
                              ? {
                                  lop_value: day.lop_value === undefined ? summary?.lop_value : day.lop_value,
                                  calculated_lop_value: day.calculated_lop_value === undefined ? summary?.calculated_lop_value : day.calculated_lop_value,
                                  adjusted_lop_value: day.adjusted_lop_value === undefined ? summary?.adjusted_lop_value : day.adjusted_lop_value,
                                }
                              : null;
                            const canAddManualPunch = !firstIn || !lastOut || positiveLop(lopValues?.lop_value) !== null;
                            const dayRequests = requestsForDay(attendanceRequests, monthlyEmployeeId, date);
                            const pendingCount = dayRequests.filter((item) => item.request.status === "PENDING").length;
                            const workMinutes = Number(summary?.work_min ?? summary?.work_minutes ?? 0);

                            return (
                              <tr key={date} className="group bg-white transition-colors hover:bg-[#f5faff]">
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#eaf4fc] text-[#1b64da]">
                                      <CalendarIcon className="h-3 w-3" />
                                    </span>
                                    <span className="font-bold text-slate-800">{formatDate(date)}</span>
                                  </div>
                                </td>

                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${statusStyles[status]}`}>
                                      {status.replace("_", " ")}
                                    </span>
                                    {pendingCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => { setRequestNotice(null); setRequestDate(date); }}
                                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                                      >
                                        Pending ({pendingCount})
                                      </button>
                                    )}
                                    {dayRequests.filter((item) => item.request.status !== "PENDING").map((item) => (
                                      <button
                                        key={`${item.type}-${item.request.id}`}
                                        type="button"
                                        onClick={() => { setRequestNotice(null); setRequestDate(date); }}
                                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${
                                          item.request.status === "APPROVED"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                            : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                                        }`}
                                      >
                                        {requestTypeLabel(item.type)} · {item.request.status === "APPROVED" ? "Approved" : "Rejected"}
                                      </button>
                                    ))}
                                  </div>
                                </td>

                                <td className="px-4 py-2"><TimePill value={firstIn} tone="plain" /></td>
                                <td className="px-4 py-2"><TimePill value={lastOut} tone="plain" /></td>

                                <td className="px-4 py-2">
                                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tabular-nums text-slate-700">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    {summary ? formatDuration(workMinutes) : "—"}
                                  </span>
                                </td>

                                <td className="px-4 py-2">
                                  <LopDetails values={lopValues} onAdjust={(currentLop) => {
                                    setLopNotice(null);
                                    setLopSelection({ userId: monthlyEmployeeId, employeeName: monthlyEmployee?.name || "Employee", date: date.slice(0, 10), currentLop });
                                  }} />
                                </td>

                                <td className="px-4 py-2 text-center font-semibold tabular-nums text-slate-600">
                                  {day?.punches?.length ?? 0}
                                </td>
                                <td className="px-4 py-2 text-center font-semibold tabular-nums text-slate-600">
                                  {day?.sessions?.length ?? 0}
                                </td>

                                <td className="sticky right-0 bg-white px-4 py-2 text-right group-hover:bg-[#f5faff]">
                                  {canAddManualPunch ? (
                                    <CorrectionButton manual date={date} onClick={() => openCorrection(monthlyEmployeeId, date)} />
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
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

      {lopSelection && (
        <LopAdjustmentModal selection={lopSelection} onClose={() => setLopSelection(null)} onSaved={handleLopSaved} />
      )}

      {requestDate && selectedDayRequests.length > 0 && (
        <AttendanceRequestModal
          date={formatDate(requestDate)}
          employeeName={monthlyEmployee?.name || "Employee"}
          requests={selectedDayRequests}
          onClose={() => setRequestDate(null)}
          onDecided={handleRequestDecision}
        />
      )}

      {/* CORRECTION MODAL */}
      {isAddCorrectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-[#bfe0f5] rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d6e8f7] bg-[#eaf4fc] p-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1b64da]" />
                <h3 className="font-black text-lg text-[#0f172a]">Add Manual Attendance Correction</h3>
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
              {correctionValidationError && (
                <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  {correctionValidationError}
                </div>
              )}
              {correctionError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  {correctionError}
                </div>
              )}
              {correctionSuccess && (
                <div className="rounded-xl bg-[#e1f1fb] border border-[#7BBDE8] p-3 text-sm text-[#0a47b3]">
                  {correctionSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">Select Employee *</label>
                <select
                  required
                  value={newCorrection.user_id}
                  onChange={(event) => setNewCorrection({ ...newCorrection, user_id: event.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#f3f9fe] border border-[#bfe0f5] text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#7BBDE8] focus:outline-none"
                >
                  <option value="">Choose employee...</option>
                  {employees.map((employee) => (
                    <option key={employee.user_id} value={employee.user_id}>
                      {employee.name} ({employee.emp_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">Punched Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newCorrection.punched_at}
                  onChange={(event) => setNewCorrection({ ...newCorrection, punched_at: event.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#f3f9fe] border border-[#bfe0f5] text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#7BBDE8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">Direction *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["IN", "OUT"] as CorrectionDirection[]).map((direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() => setNewCorrection({ ...newCorrection, direction })}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        newCorrection.direction === direction
                          ? direction === "IN"
                            ? "bg-[#e1f1fb] border-[#7BBDE8] text-[#0a47b3]"
                            : "bg-[#1b64da] border-[#1b64da] text-white"
                          : "bg-[#f3f9fe] border-[#bfe0f5] text-[#64748b]"
                      }`}
                    >
                      {direction} (Punch {direction === "IN" ? "In" : "Out"})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#475569] mb-2">Mandatory Audit Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Device offline, missed manual punch..."
                  value={newCorrection.reason}
                  onChange={(event) => setNewCorrection({ ...newCorrection, reason: event.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#f3f9fe] border border-[#bfe0f5] text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#7BBDE8] focus:outline-none"
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
                  {correctionLoading ? "Saving..." : "Save & Recompute Day"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}