"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store/store";

import {
  fetchAdminLeaveRequests,
  fetchAdminPermissionRequests,
  fetchAdminRegularizationRequests,
  decideAdminRequest,
  clearRequestMessages,
  type RequestType,
  type DecisionAction,
  type RequestStatus,
  type LeaveRequest,
  type PermissionRequest,
  type RegularizationRequest,
} from "../store/requests/requestSlice";

import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

// --------------------------------------------------
// THEME COLOURS (same family as the dashboard / #7BBDE8)
// --------------------------------------------------

const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

const AVATAR_GRADIENTS = [
  "from-cyan-400 to-blue-600",
  "from-amber-400 to-orange-600",
  "from-indigo-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-emerald-400 to-teal-600",
];

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type RequestStream =
  | "leaves"
  | "permissions"
  | "regularizations"
  | "all";

type StatusFilter = "pending" | "approved" | "rejected";

interface ApprovalRequest {
  id: number;
  name: string;
  empId: string;
  role: string;
  department: string;
  initials: string;
  type: "Leave" | "Permission" | "Regularization";
  requestType: RequestType;
  subType: string;
  dateRange: string;
  quotaInfo: string;
  appliedTime: string;
  reason: string;
  status: RequestStatus;
  metric?: number;
  metricUnit?: string;
}

interface CalendarEvent {
  date: string;
  title: string;
  person: string;
  type: "annual" | "sick" | "permission" | "regularization";
  status: RequestStatus;
}

interface CalendarRequests {
  leaves: LeaveRequest[];
  permissions: PermissionRequest[];
  regularizations: RegularizationRequest[];
}

// --------------------------------------------------
// CALENDAR DATE HELPERS
// --------------------------------------------------

const toDateKey = (value?: string | null): string => {
  if (!value) return "";

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);

  if (match) {
    return match[1];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateRangeKeys = (
  fromDate: string,
  toDate: string
): string[] => {
  const startKey = toDateKey(fromDate);
  const endKey = toDateKey(toDate);

  if (!startKey || !endKey || startKey > endKey) {
    return [];
  }

  const dates: string[] = [];

  const current = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const statusToApi = (status: StatusFilter): RequestStatus => {
  switch (status) {
    case "approved":
      return "APPROVED";

    case "rejected":
      return "REJECTED";

    default:
      return "PENDING";
  }
};

const formatDate = (value?: string | null): string => {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value?: string | null): string => {
  if (!value) return "Not provided";

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})/);

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const meridiem = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )} ${meridiem}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name?: string): string => {
  if (!name) return "NA";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getAppliedTime = (value?: string): string => {
  if (!value) return "Application date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return `Applied: ${value}`;
  }

  return `Applied: ${date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

// --------------------------------------------------
// CONVERT API DATA INTO CARD DATA
// --------------------------------------------------

const mapLeaveRequest = (
  request: LeaveRequest
): ApprovalRequest => {
  const name = request.employee_name || "Unknown Employee";

  return {
    id: request.id,
    name,
    empId: request.emp_code || "N/A",
    role: request.designation || "Employee",
    department: request.designation || "General",
    initials: getInitials(name),
    type: "Leave",
    requestType: "leave",
    subType: `${request.days} Day${request.days === 1 ? "" : "s"} Leave`,
    dateRange: `${formatDate(request.from_date)} - ${formatDate(
      request.to_date
    )}`,
    quotaInfo: request.is_retroactive
      ? "Retroactive Request"
      : `${request.days} Day${request.days === 1 ? "" : "s"} Requested`,
    appliedTime: getAppliedTime(request.created_at),
    reason: request.reason,
    status: request.status,
    metric: request.days,
    metricUnit: request.days === 1 ? "day" : "days",
  };
};

const mapPermissionRequest = (
  request: PermissionRequest
): ApprovalRequest => {
  const name = request.employee_name || "Unknown Employee";

  const hours = Math.floor(request.minutes / 60);
  const minutes = request.minutes % 60;

  const duration =
    hours > 0
      ? `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim()
      : `${minutes} minutes`;

  return {
    id: request.id,
    name,
    empId: request.emp_code || "N/A",
    role: request.designation || "Employee",
    department: request.designation || "General",
    initials: getInitials(name),
    type: "Permission",
    requestType: "permission",
    subType: `${duration} Permission`,
    dateRange: `${formatDate(request.perm_date)} · ${formatTime(
      request.start_time
    )}`,
    quotaInfo: `${request.minutes} Minutes Requested`,
    appliedTime: getAppliedTime(request.created_at),
    reason: request.reason,
    status: request.status,
    metric: request.minutes,
    metricUnit: "min",
  };
};

const mapRegularizationRequest = (
  request: RegularizationRequest
): ApprovalRequest => {
  const name = request.employee?.name || "Unknown Employee";

  let subType = request.type.replace(/_/g, " ");

  if (request.claimed_in && request.claimed_out) {
    subType = `In: ${formatTime(request.claimed_in)} · Out: ${formatTime(
      request.claimed_out
    )}`;
  } else if (request.claimed_in) {
    subType = `Claimed In: ${formatTime(request.claimed_in)}`;
  } else if (request.claimed_out) {
    subType = `Claimed Out: ${formatTime(request.claimed_out)}`;
  }

  return {
    id: request.id,
    name,
    empId: request.employee?.emp_code || "N/A",
    role: request.employee?.designation || "Employee",
    department: request.employee?.designation || "General",
    initials: getInitials(name),
    type: "Regularization",
    requestType: "regularization",
    subType,
    dateRange: formatDate(request.work_date),
    quotaInfo: request.day_context?.status
      ? `Attendance: ${request.day_context.status}`
      : "Attendance Correction",
    appliedTime: getAppliedTime(request.created_at),
    reason: request.reason,
    status: request.status,
  };
};

// --------------------------------------------------
// CALENDAR EVENT COLORS
// IMPORTANT: Keep this OUTSIDE the JSX return.
// --------------------------------------------------

const getEventColor = (type: CalendarEvent["type"]) => {
  switch (type) {
    case "annual":
      return "bg-[#dbe7ff] text-blue-800 border-blue-200";

    case "sick":
      return "bg-amber-100 text-amber-800 border-amber-200";

    case "permission":
      return "bg-[#d3ebfa] text-sky-800 border-sky-200";

    case "regularization":
      return "bg-amber-100 text-amber-800 border-amber-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

// --------------------------------------------------
// CARD STYLES PER REQUEST TYPE (display only)
// --------------------------------------------------

const TYPE_STYLES: Record<
  ApprovalRequest["type"],
  {
    panel: string;
    bubble: string;
    bubbleText: string;
    chip: string;
    dot: string;
  }
> = {
  Leave: {
    panel: "#e8f1fa",
    bubble: BLUE,
    bubbleText: "#ffffff",
    chip: "bg-[#dbe7ff] text-blue-700",
    dot: "bg-blue-600",
  },
  Permission: {
    panel: "#dcecf9",
    bubble: SKY,
    bubbleText: INK,
    chip: "bg-[#d3ebfa] text-sky-800",
    dot: "bg-[#7BBDE8]",
  },
  Regularization: {
    panel: "#fff4d9",
    bubble: "#f5b82e",
    bubbleText: INK,
    chip: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
};

// circle that grows with the number of days / minutes
function MetricBubble({
  metric,
  unit,
  color,
  text,
}: {
  metric?: number;
  unit?: string;
  color: string;
  text: string;
}) {
  const value = metric ?? 0;

  const size =
    metric === undefined
      ? 56
      : Math.round(Math.min(84, 52 + (unit === "min" ? value / 8 : value * 5)));

  return (
    <span
      className="flex shrink-0 flex-col items-center justify-center rounded-full font-black leading-none shadow-sm"
      style={{ width: size, height: size, backgroundColor: color, color: text }}
    >
      {metric === undefined ? (
        <Clock className="h-6 w-6" />
      ) : (
        <>
          <span className="text-xl">{metric}</span>
          <span className="mt-0.5 text-[10px] font-bold opacity-80">{unit}</span>
        </>
      )}
    </span>
  );
}

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function AdminRequestsApprovals() {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state

  const {
    leaveRequests,
    permissionRequests,
    regularizationRequests,

    leaveLoading,
    permissionLoading,
    regularizationLoading,

    leaveError,
    permissionError,
    regularizationError,

    deciding,
    decisionError,
    decisionSuccess,

    totalLeaveRequests,
    totalPermissionRequests,
    totalRegularizationRequests,
  } = useSelector((state: RootState) => state.requests);

  const storeAuthToken = useSelector(
    (state: RootState) => state.auth.token
  );

  // Local UI state

  const [activeTab, setActiveTab] =
    useState<RequestStream>("leaves");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("pending");

  const [calendarStream, setCalendarStream] =
    useState<RequestStream>("all");

  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentYear, setCurrentYear] = useState(2026);
  const [todayKey, setTodayKey] = useState("");

  const [calendarRequests, setCalendarRequests] =
    useState<CalendarRequests>({
      leaves: [],
      permissions: [],
      regularizations: [],
    });

  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Decision modal state

  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);

  const [decisionAction, setDecisionAction] =
    useState<DecisionAction>("APPROVE");

  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const now = new Date();
      setCurrentMonth(now.getMonth());
      setCurrentYear(now.getFullYear());
      setTodayKey(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`
      );
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  // --------------------------------------------------
  // FETCH REQUESTS
  // --------------------------------------------------

  useEffect(() => {
    const status = statusToApi(statusFilter);

    dispatch(fetchAdminLeaveRequests({ status })).catch(() => {});

    dispatch(fetchAdminPermissionRequests({ status })).catch(() => {});

    dispatch(fetchAdminRegularizationRequests({ status })).catch(() => {});
  }, [dispatch, statusFilter]);

  // --------------------------------------------------
  // FETCH ALL CALENDAR REQUESTS
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchCalendarRequests = async () => {
      if (!storeAuthToken) {
        setCalendarError("Please sign in again to load calendar events.");
        setCalendarLoading(false);
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

      if (!baseUrl) {
        setCalendarError("API URL is not configured.");
        setCalendarLoading(false);
        return;
      }

      setCalendarLoading(true);
      setCalendarError(null);

      try {
        const headers = {
          Authorization: `Bearer ${storeAuthToken}`,
        };

        const fetchRequests = async <T,>(
          endpoint: string,
          status: RequestStatus
        ): Promise<T[]> => {
          const response = await fetch(
            `${baseUrl}${endpoint}?status=${status}`,
            { headers }
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result?.message || `Unable to load ${status} calendar data.`
            );
          }

          if (!Array.isArray(result?.data?.requests)) {
            throw new Error(
              "The calendar API returned an unexpected response."
            );
          }

          return result.data.requests as T[];
        };

        const leaveEndpoint = "/api/v1/leave/admin/requests";
        const permissionEndpoint = "/api/v1/permission/admin/permissions";
        const regularizationEndpoint = "/api/v1/regularization/admin/requests";

        const [
          pendingLeaves,
          approvedLeaves,
          rejectedLeaves,

          pendingPermissions,
          approvedPermissions,
          rejectedPermissions,

          pendingRegularizations,
          approvedRegularizations,
          rejectedRegularizations,
        ] = await Promise.all([
          fetchRequests<LeaveRequest>(leaveEndpoint, "PENDING"),
          fetchRequests<LeaveRequest>(leaveEndpoint, "APPROVED"),
          fetchRequests<LeaveRequest>(leaveEndpoint, "REJECTED"),

          fetchRequests<PermissionRequest>(permissionEndpoint, "PENDING"),
          fetchRequests<PermissionRequest>(permissionEndpoint, "APPROVED"),
          fetchRequests<PermissionRequest>(permissionEndpoint, "REJECTED"),

          fetchRequests<RegularizationRequest>(
            regularizationEndpoint,
            "PENDING"
          ),
          fetchRequests<RegularizationRequest>(
            regularizationEndpoint,
            "APPROVED"
          ),
          fetchRequests<RegularizationRequest>(
            regularizationEndpoint,
            "REJECTED"
          ),
        ]);

        const uniqueById = <T extends { id: number }>(items: T[]): T[] => {
          return Array.from(
            new Map(items.map((item) => [item.id, item])).values()
          );
        };

        if (!cancelled) {
          setCalendarRequests({
            leaves: uniqueById([
              ...pendingLeaves,
              ...approvedLeaves,
              ...rejectedLeaves,
            ]),

            permissions: uniqueById([
              ...pendingPermissions,
              ...approvedPermissions,
              ...rejectedPermissions,
            ]),

            regularizations: uniqueById([
              ...pendingRegularizations,
              ...approvedRegularizations,
              ...rejectedRegularizations,
            ]),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setCalendarError(
            error instanceof Error
              ? error.message
              : "Unable to load calendar events."
          );
        }
      } finally {
        if (!cancelled) {
          setCalendarLoading(false);
        }
      }
    };

    fetchCalendarRequests();

    return () => {
      cancelled = true;
    };
  }, [storeAuthToken]);

  // --------------------------------------------------
  // CLEAR DECISION MESSAGES
  // --------------------------------------------------

  useEffect(() => {
    dispatch(clearRequestMessages());
  }, [dispatch, activeTab, statusFilter]);

  // --------------------------------------------------
  // CURRENT REQUEST LIST
  // --------------------------------------------------

  const requests: ApprovalRequest[] =
    activeTab === "leaves"
      ? leaveRequests.map(mapLeaveRequest)
      : activeTab === "permissions"
      ? permissionRequests.map(mapPermissionRequest)
      : activeTab === "regularizations"
      ? regularizationRequests.map(mapRegularizationRequest)
      : [];

  const loading =
    activeTab === "leaves"
      ? leaveLoading
      : activeTab === "permissions"
      ? permissionLoading
      : regularizationLoading;

  const error =
    activeTab === "leaves"
      ? leaveError
      : activeTab === "permissions"
      ? permissionError
      : regularizationError;

  // --------------------------------------------------
  // CALENDAR
  // --------------------------------------------------

  const monthName = new Date(
    currentYear,
    currentMonth
  ).toLocaleString("en-US", { month: "long" });

  const firstDay = new Date(
    currentYear,
    currentMonth,
    1
  ).getDay();

  const mondayOffset = (firstDay + 6) % 7;

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  const calendarDays: (number | null)[] = [
    ...Array(mondayOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => i + 1
    ),
  ];

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const calendarWeeks = calendarDays.length / 7;

  const changeMonth = (direction: number) => {
    const nextDate = new Date(
      currentYear,
      currentMonth + direction,
      1
    );

    setCurrentMonth(nextDate.getMonth());
    setCurrentYear(nextDate.getFullYear());
  };

  // --------------------------------------------------
  // BUILD CALENDAR EVENTS
  // --------------------------------------------------

  const allCalendarEvents: CalendarEvent[] = [];

  // Leave requests: one event for every day of leave.

  calendarRequests.leaves.forEach((request) => {
    const name = request.employee_name || "Unknown Employee";

    const dates = getDateRangeKeys(
      request.from_date,
      request.to_date
    );

    dates.forEach((date) => {
      allCalendarEvents.push({
        date,
        title: "Leave",
        person: name,
        type: "annual",
        status: request.status,
      });
    });
  });

  // Permission requests.

  calendarRequests.permissions.forEach((request) => {
    const date = toDateKey(request.perm_date);

    if (!date) return;

    allCalendarEvents.push({
      date,
      title: `${request.minutes}m Permission`,
      person: request.employee_name || "Unknown Employee",
      type: "permission",
      status: request.status,
    });
  });

  // Regularization requests.

  calendarRequests.regularizations.forEach((request) => {
    const date = toDateKey(request.work_date);

    if (!date) return;

    allCalendarEvents.push({
      date,
      title: `Regularization · ${request.type.replace(/_/g, " ")}`,
      person: request.employee?.name || "Unknown Employee",
      type: "regularization",
      status: request.status,
    });
  });

  // Filter by selected month and category.

  const monthPrefix = `${currentYear}-${String(
    currentMonth + 1
  ).padStart(2, "0")}`;

  const visibleCalendarEvents = allCalendarEvents.filter((event) => {
    if (!event.date.startsWith(monthPrefix)) {
      return false;
    }

    if (calendarStream === "leaves") {
      return event.type === "annual" || event.type === "sick";
    }

    if (calendarStream === "permissions") {
      return event.type === "permission";
    }

    if (calendarStream === "regularizations") {
      return event.type === "regularization";
    }

    return true;
  });

  const filteredCalendarEvents = (day: number): CalendarEvent[] => {
    const dateKey = `${currentYear}-${String(
      currentMonth + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return visibleCalendarEvents.filter(
      (event) => event.date === dateKey
    );
  };

  const visibleEventCount = visibleCalendarEvents.length;

  // display-only: counts for the header chips and today highlight
  const calendarCounts = {
    leave: visibleCalendarEvents.filter(
      (event) => event.type === "annual" || event.type === "sick"
    ).length,
    permission: visibleCalendarEvents.filter(
      (event) => event.type === "permission"
    ).length,
    regularization: visibleCalendarEvents.filter(
      (event) => event.type === "regularization"
    ).length,
  };

  // --------------------------------------------------
  // OPEN DECISION MODAL
  // --------------------------------------------------

  const openDecisionModal = (
    request: ApprovalRequest,
    action: DecisionAction
  ) => {
    setSelectedRequest(request);
    setDecisionAction(action);
    setDecisionNote("");
    dispatch(clearRequestMessages());
  };

  const closeDecisionModal = () => {
    if (deciding) return;

    setSelectedRequest(null);
    setDecisionNote("");
    dispatch(clearRequestMessages());
  };

  // --------------------------------------------------
  // SUBMIT DECISION
  // --------------------------------------------------

  const handleDecision = async () => {
    if (!selectedRequest || !decisionNote.trim()) return;

    try {
      await dispatch(
        decideAdminRequest({
          id: selectedRequest.id,
          type: selectedRequest.requestType,
          action: decisionAction,
          note: decisionNote.trim(),
        })
      );

      const status = statusToApi(statusFilter);

      if (selectedRequest.requestType === "leave") {
        await dispatch(fetchAdminLeaveRequests({ status }));
      }

      if (selectedRequest.requestType === "permission") {
        await dispatch(fetchAdminPermissionRequests({ status }));
      }

      if (selectedRequest.requestType === "regularization") {
        await dispatch(fetchAdminRegularizationRequests({ status }));
      }

      setSelectedRequest(null);
      setDecisionNote("");
    } catch {
      // Redux stores the decision/fetch error.
    }
  };

  // --------------------------------------------------
  // STATUS BADGE
  // --------------------------------------------------

  const getStatusStyle = (status: RequestStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";

      case "CANCELLED":
        return "bg-slate-100 text-slate-600 border-slate-200";

      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  // --------------------------------------------------
  // DISPLAY-ONLY DATA FOR THE NEW DESIGN
  // (uses the same totals from your API/store)
  // --------------------------------------------------

  const metricCards = [
    {
      key: "leave",
      label: "Leave Requests",
      value: totalLeaveRequests,
      note: "Live count from leave API",
      color: SKY_LIGHT,
      text: INK,
      muted: "text-black/40",
      Icon: CalendarIcon,
    },
    {
      key: "permission",
      label: "Permission Requests",
      value: totalPermissionRequests,
      note: "Live count from permission API",
      color: SKY,
      text: INK,
      muted: "text-black/40",
      Icon: Clock,
    },
    {
      key: "regularization",
      label: "Regularization Requests",
      value: totalRegularizationRequests,
      note: "Live count from regularization API",
      color: BLUE,
      text: "#ffffff",
      muted: "text-white/60",
      Icon: CheckCircle2,
    },
  ];

  const tabs: {
    key: RequestStream;
    label: string;
    count: number;
  }[] = [
    { key: "leaves", label: "Leave Requests", count: totalLeaveRequests },
    {
      key: "permissions",
      label: "Permission Requests",
      count: totalPermissionRequests,
    },
    {
      key: "regularizations",
      label: "Regularization Requests",
      count: totalRegularizationRequests,
    },
  ];

  const requestsTotal =
    totalLeaveRequests +
    totalPermissionRequests +
    totalRegularizationRequests;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen w-full bg-white font-sans antialiased text-slate-800 flex flex-col">

      <main className="flex-1 rounded-t-[40px] bg-[#f0f6fa]">

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">

          {/* =========================================
              PAGE TITLE
          ========================================= */}

          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Requests &amp; <span className="text-[#3b82f6]">Approvals</span>
            </h1>

            <p className="text-base text-slate-500 mt-2">
              Review leave, permission and regularization requests.
            </p>
          </div>

          {/* =========================================
              1. TOP METRIC CARDS
          ========================================= */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {metricCards.map((card) => {
              const share =
                requestsTotal > 0
                  ? Math.round((card.value / requestsTotal) * 100)
                  : 0;

              return (
                <div
                  key={card.key}
                  className="flex min-h-[200px] flex-col justify-between rounded-[32px] border border-[#e6edf4] bg-white p-7 shadow-sm"
                  style={{ backgroundColor: card.color, color: card.text }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-bold leading-tight">
                      {card.label}
                    </p>

                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/60"
                    >
                      <card.Icon className="h-5 w-5" />
                    </span>
                  </div>

                  <div>
                    <span
                      className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black"
                      style={{
                        backgroundColor: card.color,
                        color: card.text,
                      }}
                    >
                      {card.value}
                    </span>

                    <p className={`mt-2 text-xs font-semibold ${card.muted}`}>
                      Matching Requests
                    </p>

                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/50">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: card.text === "#ffffff" ? "#ffffff" : INK,
                        }}
                      />
                    </div>

                    <div className={`mt-2 flex items-center justify-between text-[11px] font-medium ${card.muted}`}>
                      <span>{card.note}</span>
                      <span className="font-bold">{share}%</span>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* =========================================
              2. FILTER BAR AND TABS
          ========================================= */}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            {/* REQUEST TABS */}

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 xl:pb-0">

              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-sm font-bold transition-all ${
                    activeTab === tab.key
                      ? "border-[#1b64da] bg-[#1b64da] text-white shadow-sm"
                      : "border-[#e6edf4] bg-white text-slate-600 hover:bg-[#f5faff]"
                  }`}
                >
                  {tab.label}

                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      activeTab === tab.key
                        ? "bg-white/25 text-white"
                        : "bg-[#eef4fa] text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}

            </div>

            {/* STATUS FILTER */}

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center bg-white rounded-full p-1.5 border border-[#e6edf4] shadow-sm">

                {(
                  ["pending", "approved", "rejected"] as StatusFilter[]
                ).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition-all ${
                      statusFilter === status
                        ? "bg-[#1b64da] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}

              </div>

              <div className="flex items-center gap-2.5 px-5 py-3 bg-white border border-[#e6edf4] rounded-full text-sm font-semibold text-slate-500 shadow-sm">
                <Filter className="w-4 h-4 text-slate-500" />
                All Departments
              </div>

            </div>

          </div>

          {/* =========================================
              3. REQUEST CARDS
          ========================================= */}

          {decisionSuccess && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {decisionSuccess}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-[32px] border border-[#e6edf4] shadow-sm p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#1b64da] animate-spin" />
              <p className="text-slate-500 font-medium">
                Loading {activeTab} requests...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-[32px] border border-[#e6edf4] shadow-sm p-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf4fc] flex items-center justify-center text-[#1b64da]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No {statusFilter} requests found
              </h3>

              <p className="mt-2 text-slate-500">
                There are currently no matching {activeTab} requests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {requests.map((req, index) => {
                const ts = TYPE_STYLES[req.type];

                return (
                  <div
                    key={`${req.requestType}-${req.id}`}
                    className="bg-white rounded-[32px] p-6 border border-[#e6edf4] shadow-sm flex flex-col justify-between hover:border-[#7BBDE8] hover:shadow-md transition-all min-w-0"
                  >

                    <div>

                      {/* EMPLOYEE DETAILS */}

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-3.5 min-w-0">

                          <div
                            className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${
                              AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
                            } text-white font-black flex items-center justify-center text-lg shadow-sm`}
                          >
                            {req.initials}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-bold text-slate-900">
                                {req.name}
                              </h4>

                              <span className="text-xs font-bold text-blue-700 bg-[#dbe5ff] px-2.5 py-0.5 rounded-full">
                                {req.empId}
                              </span>
                            </div>

                            <p className="text-[15px] text-slate-500 mt-1.5 truncate">
                              {req.role}
                            </p>

                          </div>

                        </div>

                        <span
                          className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-bold ${ts.chip}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${ts.dot}`} />
                          {req.type}
                        </span>

                      </div>

                      {/* REQUEST INFORMATION (tinted panel + size bubble) */}

                      <div
                        className="mt-5 rounded-3xl p-4"
                        style={{ backgroundColor: ts.panel }}
                      >

                        <div className="flex items-center justify-between gap-3">

                          <div className="min-w-0">

                            <span className="text-[12px] text-slate-500 block uppercase font-bold tracking-wider">
                              Request Type
                            </span>

                            <span className="font-extrabold text-slate-900 text-base mt-1.5 block leading-snug">
                              {req.subType}
                            </span>

                            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-slate-700">
                              <span className={`w-2 h-2 rounded-full ${ts.dot}`} />
                              {req.status === "PENDING"
                                ? "Pending Admin Approval"
                                : req.status}
                            </span>

                          </div>

                          <MetricBubble
                            metric={req.metric}
                            unit={req.metricUnit}
                            color={ts.bubble}
                            text={ts.bubbleText}
                          />

                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/80 pt-3">

                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <CalendarIcon className="w-4 h-4 text-slate-500" />
                            {req.dateRange}
                          </span>

                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600">
                            {req.quotaInfo}
                          </span>

                        </div>

                      </div>

                      {/* REASON */}

                      <div className="mt-4">

                        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Reason / Justification
                        </span>

                        <p className="border-l-4 border-[#7BBDE8] pl-4 text-[15px] md:text-base text-slate-600 italic leading-relaxed">
                          &ldquo;{req.reason}&rdquo;
                        </p>

                      </div>

                      {/* APPLIED TIME */}

                      <p className="mt-3 text-[13px] font-medium text-slate-400">
                        {req.appliedTime}
                      </p>

                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">

                      <div className="flex items-center gap-2 text-[13px] font-semibold">
                        <span
                          className={`px-3 py-1.5 rounded-full border ${getStatusStyle(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.status === "PENDING" && (
                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              openDecisionModal(req, "REJECT")
                            }
                            disabled={deciding}
                            className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-rose-600 hover:bg-rose-50 rounded-full transition-colors border border-rose-200 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>

                          <button
                            onClick={() =>
                              openDecisionModal(req, "APPROVE")
                            }
                            disabled={deciding}
                            className="flex items-center gap-2 px-5 py-2.5 text-[15px] font-bold text-white bg-[#1b64da] hover:bg-[#1552b5] rounded-full transition-colors shadow-sm disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {req.type === "Regularization"
                              ? "Reconcile"
                              : "Approve"}
                          </button>

                        </div>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

          {/* =========================================
              4. TEAM ABSENCE & LEAVE CALENDAR
          ========================================= */}

          <div className="bg-white rounded-[32px] border border-[#e6edf4] shadow-sm overflow-hidden flex flex-col shrink-0">

            {/* CALENDAR HEADER */}

            <div className="bg-white border-b border-[#e8eef5] px-5 md:px-8 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Team Absence &amp; Leave Calendar
                </h2>

                <p className="text-base text-slate-500 mt-1.5">
                  Company-wide planned leave, permission hours &amp;
                  regularizations
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { label: "Leave", value: calendarCounts.leave, dot: "bg-blue-600", chip: "bg-[#dbe7ff] text-blue-800" },
                    { label: "Permission", value: calendarCounts.permission, dot: "bg-[#7BBDE8]", chip: "bg-[#d3ebfa] text-sky-800" },
                    { label: "Regularization", value: calendarCounts.regularization, dot: "bg-amber-500", chip: "bg-amber-100 text-amber-800" },
                  ].map((chip) => (
                    <span
                      key={chip.label}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${chip.chip}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${chip.dot}`} />
                      {chip.label}
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px]">
                        {chip.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">

                {/* CALENDAR STREAM FILTER */}

                <div className="flex items-center bg-white border border-[#e6edf4] rounded-full p-1.5 text-sm shadow-sm overflow-x-auto">

                  {(
                    [
                      "all",
                      "leaves",
                      "permissions",
                      "regularizations",
                    ] as RequestStream[]
                  ).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCalendarStream(tab)}
                      className={`px-4 py-2 rounded-full capitalize font-semibold whitespace-nowrap transition-colors ${
                        calendarStream === tab
                          ? "bg-[#1b64da] text-white font-bold shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab === "all"
                        ? "All"
                        : tab === "leaves"
                        ? "Leaves"
                        : tab}
                    </button>
                  ))}

                </div>

                {/* MONTH NAVIGATION */}

                <div className="flex items-center gap-3 bg-white border border-[#e6edf4] px-3 py-2 rounded-full text-sm font-bold text-slate-800 shadow-sm">

                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 rounded-full hover:bg-[#eef4fa] hover:text-[#1b64da] text-slate-500"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="min-w-[130px] text-center">
                    {monthName} {currentYear}
                  </span>

                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-1.5 rounded-full hover:bg-[#eef4fa] hover:text-[#1b64da] text-slate-500"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                </div>

              </div>

            </div>

            {/* CALENDAR ERROR */}

            {calendarError && (
              <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {calendarError}
              </div>
            )}

            {/* WEEKDAYS + DAY TILES */}

            <div className="bg-white px-4 pb-5 pt-4 md:px-6">

              <div className="grid grid-cols-7 gap-2 pb-2">

                {[
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                  "Sun",
                ].map((day) => (
                  <div
                    key={day}
                    className="rounded-full bg-[#eef4fa] py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    {day}
                  </div>
                ))}

              </div>

              <div
                className="grid grid-cols-7 gap-2"
                style={{
                  gridTemplateRows: `repeat(${calendarWeeks}, minmax(100px, 1fr))`,
                }}
              >

                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`${currentYear}-${currentMonth}-${idx}`} />;
                  }

                  const isWeekend =
                    idx % 7 === 5 || idx % 7 === 6;

                  const events = filteredCalendarEvents(day);

                  const dateKey = `${currentYear}-${String(
                    currentMonth + 1
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                  const isToday = dateKey === todayKey;

                  return (
                    <div
                      key={`${currentYear}-${currentMonth}-${idx}`}
                      className={`relative flex min-h-[100px] md:min-h-[116px] flex-col rounded-2xl border p-2.5 transition-colors ${
                        events.length > 0
                          ? "border-[#cfe3f5] bg-[#f3f9fe]"
                          : isWeekend
                          ? "border-transparent bg-[#f5faff]"
                          : "border-[#eef2f7] bg-white"
                      } ${isToday ? "ring-2 ring-[#1b64da] ring-offset-1" : ""}`}
                    >

                      {/* DATE */}

                      <div className="flex items-center justify-between shrink-0">

                        <span
                          className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-black ${
                            isToday
                              ? "bg-[#1b64da] text-white"
                              : "text-slate-800"
                          }`}
                        >
                          {String(day).padStart(2, "0")}
                        </span>

                        {events.length > 0 ? (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#7BBDE8] px-1.5 text-[11px] font-extrabold text-slate-900">
                            {events.length}
                          </span>
                        ) : (
                          isWeekend && (
                            <span className="hidden xl:block text-[11px] font-medium text-slate-400">
                              Weekend
                            </span>
                          )
                        )}

                      </div>

                      {/* EVENTS */}

                      <div className="mt-2 space-y-1.5">

                        {events.slice(0, 2).map((event, eventIndex) => (
                          <div
                            key={`${event.date}-${eventIndex}`}
                            title={`${event.title} · ${event.person} · ${event.status}`}
                            className={`px-2 py-1 rounded-lg border text-[11px] md:text-xs font-semibold truncate ${getEventColor(
                              event.type
                            )}`}
                          >
                            {event.title}

                            <span className="hidden xl:inline">
                              {" · "}
                              {event.person}
                            </span>
                          </div>
                        ))}

                        {events.length > 2 && (
                          <div className="px-2 text-[11px] font-bold text-[#1b64da]">
                            +{events.length - 2} more
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}

              </div>

            </div>

            {/* CALENDAR LEGEND */}

            <div className="px-5 md:px-8 py-4 bg-white border-t border-[#e8eef5] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

                {/* LEAVE */}

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />

                  <span className="text-sm font-medium text-slate-700">
                    Leave
                  </span>
                </div>

                {/* PERMISSION */}

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#7BBDE8]" />

                  <span className="text-sm font-medium text-slate-700">
                    Permission Hours
                  </span>
                </div>

                {/* REGULARIZATION */}

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />

                  <span className="text-sm font-medium text-slate-700">
                    Regularization
                  </span>
                </div>

              </div>

              {/* EVENT COUNT */}

              <div className="text-sm font-medium text-slate-500">
                {calendarLoading
                  ? "Loading team events..."
                  : `Showing ${visibleEventCount} team events`}
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* =========================================
          5. APPROVE / REJECT MODAL
      ========================================= */}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-white rounded-[28px] shadow-2xl overflow-hidden">

            {/* MODAL HEADER */}

            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {decisionAction === "APPROVE"
                    ? selectedRequest.type === "Regularization"
                      ? "Reconcile Request"
                      : "Approve Request"
                    : "Reject Request"}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Request ID: #{selectedRequest.id}
                </p>
              </div>

              <button
                onClick={closeDecisionModal}
                disabled={deciding}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-6">

              <div className="p-4 rounded-2xl border border-slate-100 bg-white">

                <p className="text-sm text-slate-500">
                  Employee
                </p>

                <p className="font-bold text-slate-900 mt-1">
                  {selectedRequest.name}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  {selectedRequest.type} · {selectedRequest.subType}
                </p>

              </div>

              <label className="block mt-5 text-sm font-bold text-slate-700">
                Decision Note <span className="text-rose-600">*</span>
              </label>

              <textarea
                value={decisionNote}
                onChange={(event) =>
                  setDecisionNote(event.target.value)
                }
                rows={4}
                maxLength={1000}
                placeholder={
                  decisionAction === "APPROVE"
                    ? "Enter the reason for approving this request..."
                    : "Enter the reason for rejecting this request..."
                }
                className="w-full mt-2 p-4 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BBDE8] focus:border-transparent resize-none"
              />

              <div className="flex items-center justify-between mt-2">

                <p className="text-xs text-slate-400">
                  A decision note is required.
                </p>

                <p className="text-xs text-slate-400">
                  {decisionNote.length}/1000
                </p>

              </div>

              {decisionError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                  {decisionError}
                </div>
              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">

              <button
                onClick={closeDecisionModal}
                disabled={deciding}
                className="px-5 py-2.5 rounded-full border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDecision}
                disabled={deciding || !decisionNote.trim()}
                className={`px-5 py-2.5 rounded-full text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  decisionAction === "APPROVE"
                    ? "bg-[#1b64da] hover:bg-[#1552b5]"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >

                {deciding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {decisionAction === "APPROVE" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}

                    Confirm{" "}
                    {decisionAction === "APPROVE"
                      ? "Approval"
                      : "Rejection"}
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}