
"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "../components/SideBar";

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

  // Handle a time-only value such as 14:30:00.
  const timeMatch = value.match(/^(\d{1,2}):(\d{2})/);

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  // Calendar uses the same authentication token.
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
  const [currentYear, setCurrentYear] = useState(2000);

  // Calendar data is kept separate from the request-card Redux arrays.
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

  // --------------------------------------------------
  // INITIALIZE CURRENT CALENDAR MONTH
  // --------------------------------------------------

  useEffect(() => {
    const now = new Date();

    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
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
  // Independent of the request-card status filter.
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

        const statuses: RequestStatus[] = [
          "PENDING",
          "APPROVED",
          "REJECTED",
        ];

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
            throw new Error("The calendar API returned an unexpected response.");
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

          fetchRequests<RegularizationRequest>(regularizationEndpoint, "PENDING"),
          fetchRequests<RegularizationRequest>(regularizationEndpoint, "APPROVED"),
          fetchRequests<RegularizationRequest>(regularizationEndpoint, "REJECTED"),
        ]);

        // Remove duplicates by request ID.
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
  // CLEAR DECISION MESSAGES WHEN PAGE CHANGES
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

  const currentCount =
    activeTab === "leaves"
      ? totalLeaveRequests
      : activeTab === "permissions"
      ? totalPermissionRequests
      : totalRegularizationRequests;

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
  // BUILD CALENDAR EVENTS FROM API DATA
  // --------------------------------------------------

  const allCalendarEvents: CalendarEvent[] = [];

  // Leave requests: create one event for every day of the leave.
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

  // Filter calendar events by the selected month and category.
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

  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "annual":
        return "bg-[#eaf2fd] text-[#0284c7] border-[#d6e5fb]";

      case "sick":
        return "bg-amber-50 text-amber-800 border-amber-200";

      case "permission":
        return "bg-sky-50 text-[#0284c7] border-sky-200";

      case "regularization":
        return "bg-blue-50 text-[#0284c7] border-blue-200";

      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
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
    if (!selectedRequest) return;

    if (!decisionNote.trim()) {
      return;
    }

    try {
      await dispatch(
        decideAdminRequest({
          id: selectedRequest.id,
          type: selectedRequest.requestType,
          action: decisionAction,
          note: decisionNote.trim(),
        })
      );

      // Refresh the list after the decision.

      const status = statusToApi(statusFilter);

      if (selectedRequest.requestType === "leave") {
        await dispatch(
          fetchAdminLeaveRequests({ status })
        );
      }

      if (selectedRequest.requestType === "permission") {
        await dispatch(
          fetchAdminPermissionRequests({ status })
        );
      }

      if (selectedRequest.requestType === "regularization") {
        await dispatch(
          fetchAdminRegularizationRequests({ status })
        );
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
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen w-full bg-[#f0f6fa] flex font-sans text-slate-800">

      <Sidebar />

      <main className="flex-1 min-w-0 min-h-screen xl:h-screen xl:overflow-y-auto p-4 md:p-6 xl:p-8">

        <div className="w-full mx-auto flex flex-col gap-6">

          {/* =========================================
              1. TOP METRIC CARDS
          ========================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

            {/* LEAVE */}

            <div className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm hover:shadow-md transition-all">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <h3 className="text-xl font-bold text-slate-900">
                    Leave Requests
                  </h3>

                  <div className="mt-3 flex items-baseline gap-3">

                    <span className="text-[44px] leading-none font-extrabold text-[#0284c7]">
                      {totalLeaveRequests}
                    </span>

                    <span className="text-base font-medium text-slate-500">
                      Matching Requests
                    </span>

                  </div>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#eaf2fd] border border-[#d3e7fa] flex items-center justify-center text-[#0284c7]">
                  <CalendarIcon className="w-7 h-7" />
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 text-base font-medium text-slate-500">
                Live count from leave API
              </div>

            </div>

            {/* PERMISSION */}

            <div className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm hover:shadow-md transition-all">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <h3 className="text-xl font-bold text-slate-900">
                    Permission Requests
                  </h3>

                  <div className="mt-3 flex items-baseline gap-3">

                    <span className="text-[44px] leading-none font-extrabold text-[#0284c7]">
                      {totalPermissionRequests}
                    </span>

                    <span className="text-base font-medium text-slate-500">
                      Matching Requests
                    </span>

                  </div>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#eaf2fd] border border-[#d3e7fa] flex items-center justify-center text-[#0284c7]">
                  <Clock className="w-7 h-7" />
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 text-base font-medium text-slate-500">
                Live count from permission API
              </div>

            </div>

            {/* REGULARIZATION */}

            <div className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm hover:shadow-md transition-all">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <h3 className="text-xl font-bold text-slate-900">
                    Regularization Requests
                  </h3>

                  <div className="mt-3 flex items-baseline gap-3">

                    <span className="text-[44px] leading-none font-extrabold text-[#0284c7]">
                      {totalRegularizationRequests}
                    </span>

                    <span className="text-base font-medium text-slate-500">
                      Matching Requests
                    </span>

                  </div>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#eaf2fd] border border-[#d3e7fa] flex items-center justify-center text-[#0284c7]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 text-base font-medium text-slate-500">
                Live count from regularization API
              </div>

            </div>

          </div>

          {/* =========================================
              2. FILTER BAR AND TABS
          ========================================= */}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            {/* REQUEST TABS */}

            <div className="flex items-center gap-6 border-b xl:border-none border-slate-200 overflow-x-auto pb-2 xl:pb-0">

              <button
                onClick={() => setActiveTab("leaves")}
                className={`whitespace-nowrap flex items-center gap-2.5 pb-3 text-base font-bold transition-all border-b-[3px] ${
                  activeTab === "leaves"
                    ? "text-[#0284c7] border-[#0284c7]"
                    : "text-slate-500 border-transparent hover:text-slate-800"
                }`}
              >
                Leave Requests

                <span className="px-2.5 py-1 text-[13px] font-bold rounded-full bg-[#0284c7] text-white">
                  {totalLeaveRequests}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("permissions")}
                className={`whitespace-nowrap flex items-center gap-2.5 pb-3 text-base font-bold transition-all border-b-[3px] ${
                  activeTab === "permissions"
                    ? "text-[#0284c7] border-[#0284c7]"
                    : "text-slate-500 border-transparent hover:text-slate-800"
                }`}
              >
                Permission Requests

                <span className="px-2.5 py-1 text-[13px] font-bold rounded-full bg-slate-100 text-slate-600">
                  {totalPermissionRequests}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("regularizations")}
                className={`whitespace-nowrap flex items-center gap-2.5 pb-3 text-base font-bold transition-all border-b-[3px] ${
                  activeTab === "regularizations"
                    ? "text-[#0284c7] border-[#0284c7]"
                    : "text-slate-500 border-transparent hover:text-slate-800"
                }`}
              >
                Regularization Requests

                <span className="px-2.5 py-1 text-[13px] font-bold rounded-full bg-slate-100 text-slate-600">
                  {totalRegularizationRequests}
                </span>
              </button>

            </div>

            {/* STATUS FILTER */}

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center bg-white rounded-xl p-1.5 border border-[#d6e5fb] shadow-sm">

                {(
                  ["pending", "approved", "rejected"] as StatusFilter[]
                ).map((status) => (

                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2.5 rounded-lg text-[15px] font-bold capitalize transition-all ${
                      statusFilter === status
                        ? "bg-[#0284c7] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>

                ))}

              </div>

              <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-[#d6e5fb] rounded-xl text-base font-semibold text-slate-500 shadow-sm">
                <Filter className="w-5 h-5 text-slate-500" />
                All Departments
              </div>

            </div>

          </div>

          {/* =========================================
              3. REQUEST CARDS
          ========================================= */}

          {decisionSuccess && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {decisionSuccess}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (

            <div className="bg-white rounded-2xl border border-[#d6e5fb] p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#0284c7] animate-spin" />
              <p className="text-slate-500 font-medium">
                Loading {activeTab} requests...
              </p>
            </div>

          ) : requests.length === 0 ? (

            <div className="bg-white rounded-2xl border border-[#d6e5fb] p-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf2fd] flex items-center justify-center text-[#0284c7]">
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

              {requests.map((req) => (

                <div
                  key={`${req.requestType}-${req.id}`}
                  className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm flex flex-col justify-between hover:border-[#7BBDE8] hover:shadow-md transition-all min-w-0"
                >

                  <div>

                    {/* EMPLOYEE DETAILS */}

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex items-center gap-3.5 min-w-0">

                        <div className="w-14 h-14 shrink-0 rounded-full bg-[#eaf2fd] border border-[#d3e5fa] text-[#0284c7] font-bold flex items-center justify-center text-lg">
                          {req.initials}
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h4 className="text-lg font-bold text-slate-900">
                              {req.name}
                            </h4>

                            <span className="text-[13px] text-slate-400 font-semibold">
                              {req.empId}
                            </span>

                          </div>

                          <p className="text-[15px] text-slate-500 mt-1.5 truncate">
                            {req.role}
                          </p>

                        </div>

                      </div>

                      <span className="shrink-0 px-3 py-1.5 rounded-full text-[13px] font-bold bg-[#eaf2fd] text-[#0284c7] border border-[#d6e5fb]">
                        {req.type}
                      </span>

                    </div>

                    {/* REQUEST INFORMATION */}

                    <div className="mt-5 grid grid-cols-2 gap-4 py-4 px-4 bg-[#f8fbff] rounded-xl border border-[#e2edfa]">

                      <div className="min-w-0">

                        <span className="text-[13px] text-slate-400 block uppercase font-bold tracking-wider">
                          Request Type
                        </span>

                        <span className="font-bold text-slate-800 text-base mt-2 block leading-snug">
                          {req.subType}
                        </span>

                        <span className="text-[13px] text-[#0284c7] font-semibold mt-2 block">
                          {req.status === "PENDING"
                            ? "● Pending Admin Approval"
                            : req.status}
                        </span>

                      </div>

                      <div className="text-right min-w-0">

                        <span className="text-[13px] text-slate-400 block uppercase font-bold tracking-wider">
                          Date / Details
                        </span>

                        <span className="font-semibold text-slate-700 text-base mt-2 block leading-snug">
                          {req.dateRange}
                        </span>

                        <span className="text-[13px] text-slate-500 mt-2 block">
                          {req.quotaInfo}
                        </span>

                      </div>

                    </div>

                    {/* REASON */}

                    <div className="mt-4">

                      <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Reason / Justification
                      </span>

                      <p className="text-[15px] md:text-base text-slate-600 italic bg-white p-4 rounded-xl border border-slate-100 leading-relaxed">
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
                          className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>

                        <button
                          onClick={() =>
                            openDecisionModal(req, "APPROVE")
                          }
                          disabled={deciding}
                          className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-xl transition-colors shadow-sm disabled:opacity-50"
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

              ))}

            </div>

          )}

          {/* =========================================
              4. TEAM ABSENCE & LEAVE CALENDAR
          ========================================= */}

          <div className="bg-white rounded-2xl border border-[#d6e5fb] shadow-sm overflow-hidden flex flex-col shrink-0">

            {/* CALENDAR HEADER */}

            <div className="bg-gradient-to-r from-[#eaf2fd] via-[#f0f6fa] to-[#eaf2fd] border-b border-[#d3e7fa] px-5 md:px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

              <div>

                <h2 className="text-2xl font-bold text-slate-900">
                  Team Absence &amp; Leave Calendar
                </h2>

                <p className="text-base text-slate-500 mt-1.5">
                  Company-wide planned leave, permission hours &amp;
                  regularizations
                </p>

              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">

                {/* CALENDAR STREAM FILTER */}

                <div className="flex items-center bg-white border border-[#d3e7fa] rounded-xl p-1.5 text-[15px] shadow-sm overflow-x-auto">

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
                      onClick={() => setCalendarStream(tab)}
                      className={`px-4 py-2.5 rounded-lg capitalize font-semibold whitespace-nowrap transition-colors ${
                        calendarStream === tab
                          ? "bg-[#0284c7] text-white font-bold shadow-sm"
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

                <div className="flex items-center gap-4 bg-white border border-[#d3e7fa] px-4 py-3 rounded-xl text-base font-bold text-slate-800 shadow-sm">

                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-1 hover:text-[#0284c7] text-slate-500"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="min-w-[130px] text-center">
                    {monthName} {currentYear}
                  </span>

                  <button
                    onClick={() => changeMonth(1)}
                    className="p-1 hover:text-[#0284c7] text-slate-500"
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

            {/* WEEKDAY HEADER */}

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-3.5 text-base font-bold text-slate-500 uppercase tracking-wider">

              {[
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun",
              ].map((day) => (

                <div key={day}>
                  {day}
                </div>

              ))}

            </div>

            {/* CALENDAR GRID */}

            <div
              className="grid grid-cols-7"
              style={{
                gridTemplateRows: `repeat(${calendarWeeks}, minmax(85px, 1fr))`,
              }}
            >

              {calendarDays.map((day, idx) => {

                const isWeekend =
                  idx % 7 === 5 || idx % 7 === 6;

                const events = day
                  ? filteredCalendarEvents(day)
                  : [];

                return (

                  <div
                    key={`${currentYear}-${currentMonth}-${idx}`}
                    className={`min-h-[85px] md:min-h-[95px] p-2 md:p-3 border-r border-b border-slate-100 flex flex-col ${
                      isWeekend
                        ? "bg-slate-50/60"
                        : "bg-white"
                    }`}
                  >

                    <div className="flex items-center justify-between text-base font-bold text-slate-400 shrink-0">

                      <span
                        className={
                          day
                            ? "text-slate-800"
                            : "text-transparent"
                        }
                      >
                        {day
                          ? String(day).padStart(2, "0")
                          : "00"}
                      </span>

                      {isWeekend && day && (
                        <span className="hidden xl:block text-[13px] text-slate-400 font-medium">
                          Weekend
                        </span>
                      )}

                    </div>

                    <div className="space-y-1.5 mt-2">

                      {events.map((event, eventIndex) => (

                        <div
                          key={`${event.date}-${eventIndex}`}
                          title={`${event.title} · ${event.person} · ${event.status}`}
                          className={`px-2 py-1.5 rounded-md border text-xs md:text-sm font-semibold truncate ${getEventColor(
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

                    </div>

                  </div>

                );

              })}

            </div>

            {/* CALENDAR LEGEND */}

            <div className="px-5 md:px-6 py-4 bg-slate-50/60 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
                  <span className="text-base font-medium text-slate-700">
                    Leave
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#7BBDE8]" />
                  <span className="text-base font-medium text-slate-700">
                    Permission Hours
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400" />
                  <span className="text-base font-medium text-slate-700">
                    Regularization
                  </span>
                </div>

              </div>

              <div className="text-base font-medium text-slate-500">
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

          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

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
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-6">

              <div className="p-4 rounded-xl bg-[#f8fbff] border border-[#e2edfa]">

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
                className="w-full mt-2 p-4 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-transparent resize-none"
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
                <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
                  {decisionError}
                </div>
              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">

              <button
                onClick={closeDecisionModal}
                disabled={deciding}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDecision}
                disabled={deciding || !decisionNote.trim()}
                className={`px-5 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  decisionAction === "APPROVE"
                    ? "bg-[#0284c7] hover:bg-[#0369a1]"
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
