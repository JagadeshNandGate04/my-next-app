"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Filter,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

const getPageItems = (current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (current >= total - 3) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
};

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
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
      style={{ backgroundColor: color, color: text }}
    >
      {metric === undefined ? (
        <Clock className="h-4 w-4" aria-label="Attendance correction" />
      ) : (
        <>
          <span className="tabular-nums">{metric}</span>
          <span>{unit}</span>
        </>
      )}
    </span>
  );
}

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

function AdminRequestsApprovals() {
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

  // Local UI state

  const [activeTab, setActiveTab] =
    useState<RequestStream>("leaves");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("pending");

  // Decision modal state

  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);

  const [decisionAction, setDecisionAction] =
    useState<DecisionAction>("APPROVE");

  const [decisionNote, setDecisionNote] = useState("");

  // Deep link from the dashboard calendar: ?tab=&status=&id=
  const [highlightedRequest, setHighlightedRequest] = useState<{
    key: string;
    status: StatusFilter;
    fromNotification: boolean;
  } | null>(null);
  const [deepLinkInitialized, setDeepLinkInitialized] = useState(false);
  const [deepLinkVersion, setDeepLinkVersion] = useState(0);
  const scrolledToRequest = useRef(false);
  const searchKey = useSearchParams().toString();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const params = new URLSearchParams(searchKey);
      const tab = params.get("tab");
      const status = params.get("status");
      const id = params.get("id");

      if (tab === "leaves" || tab === "permissions" || tab === "regularizations") {
        setActiveTab(tab);
      }
      if (status === "pending" || status === "approved" || status === "rejected") {
        setStatusFilter(status);
      }
      if (
        id &&
        (tab === "leaves" || tab === "permissions" || tab === "regularizations") &&
        (status === "pending" || status === "approved" || status === "rejected")
      ) {
        scrolledToRequest.current = false;
        setHighlightedRequest({
          key: `${tab}-${id}`,
          status,
          fromNotification: params.get("from") === "notification",
        });
        setDeepLinkVersion((version) => version + 1);
      }
      setDeepLinkInitialized(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [searchKey]);

  // --------------------------------------------------
  // FETCH REQUESTS
  // --------------------------------------------------

  useEffect(() => {
    if (!deepLinkInitialized) return;
    const status = statusToApi(statusFilter);

    dispatch(fetchAdminLeaveRequests({ status })).catch(() => {});

    dispatch(fetchAdminPermissionRequests({ status })).catch(() => {});

    dispatch(fetchAdminRegularizationRequests({ status })).catch(() => {});
  }, [dispatch, statusFilter, deepLinkInitialized, deepLinkVersion]);

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

  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  // The page returns to 1 whenever the reset key changes.
  const pageResetKey = `${activeTab}|${statusFilter}`;
  const totalRecords = requests.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(
    pageState.key === pageResetKey ? pageState.page : 1,
    totalPages
  );
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalRecords);
  const setPage = (page: number) => setPageState({ key: pageResetKey, page });
  const pagedRequests = requests.slice(pageStartIndex, pageEndIndex);
  const highlightedIndex = highlightedRequest
    ? requests.findIndex(
        (request) => `${activeTab}-${request.id}` === highlightedRequest.key
      )
    : -1;

  const loading =
    activeTab === "leaves"
      ? leaveLoading
      : activeTab === "permissions"
      ? permissionLoading
      : regularizationLoading;

  useEffect(() => {
    if (
      !highlightedRequest ||
      highlightedRequest.status !== statusFilter ||
      loading ||
      scrolledToRequest.current
    ) return;

    const element = document.getElementById(`request-${highlightedRequest.key}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      scrolledToRequest.current = true;
      return;
    }

    if (highlightedIndex < 0) return;

    const targetPage = Math.floor(highlightedIndex / pageSize) + 1;
    if (targetPage === currentPage) return;

    const timerId = window.setTimeout(
      () => setPageState({ key: pageResetKey, page: targetPage }),
      0
    );
    return () => window.clearTimeout(timerId);
  }, [highlightedRequest, highlightedIndex, statusFilter, activeTab, loading, leaveRequests, permissionRequests, regularizationRequests, currentPage, pageSize, pageResetKey]);

  const error =
    activeTab === "leaves"
      ? leaveError
      : activeTab === "permissions"
      ? permissionError
      : regularizationError;

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
      color: SKY_LIGHT,
      text: INK,
      muted: "text-black/40",
      Icon: CalendarIcon,
    },
    {
      key: "permission",
      label: "Permission Requests",
      value: totalPermissionRequests,
      color: SKY,
      text: INK,
      muted: "text-black/40",
      Icon: Clock,
    },
    {
      key: "regularization",
      label: "Regularization Requests",
      value: totalRegularizationRequests,
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
    Icon: typeof CalendarIcon;
  }[] = [
    { key: "leaves", label: "Leave Requests", count: totalLeaveRequests, Icon: CalendarIcon },
    {
      key: "permissions",
      label: "Permission Requests",
      count: totalPermissionRequests,
      Icon: Clock,
    },
    {
      key: "regularizations",
      label: "Regularization Requests",
      count: totalRegularizationRequests,
      Icon: CheckCircle2,
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

        <div className="mx-auto flex w-full max-w-[2400px] flex-col gap-6 px-3 py-8 sm:px-5 lg:px-6 lg:py-10">

          {/* =========================================
              PAGE TITLE
          ========================================= */}

          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
              Request Approvals
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review leave, permission and regularization requests.
            </p>
          </div>

          {/* =========================================
              1. TOP METRIC CARDS
          ========================================= */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            {metricCards.map((card) => {
              const share =
                requestsTotal > 0
                  ? Math.round((card.value / requestsTotal) * 100)
                  : 0;

              return (
                <div
                  key={card.key}
                  className="flex flex-col gap-3 rounded-2xl border border-[#e6edf4] bg-white px-5 py-4 shadow-sm"
                  style={{ backgroundColor: card.color, color: card.text }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold leading-tight">
                      {card.label}
                    </p>

                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-600"
                    >
                      <card.Icon className="h-4 w-4" />
                    </span>
                  </div>

                  <div>
                    <span className="text-2xl font-black leading-none tabular-nums">
                      {card.value}
                    </span>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/50">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: card.text === "#ffffff" ? "#ffffff" : INK,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* =========================================
              2. FILTER BAR AND TABS
          ========================================= */}

          <div className="flex flex-col gap-5 rounded-2xl border border-[#e6edf4] bg-white px-5 py-4 shadow-sm xl:flex-row xl:items-end xl:justify-between">

            {/* REQUEST TABS */}

            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Request type
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">

                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    aria-pressed={activeTab === tab.key}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      activeTab === tab.key
                        ? "border-[#1b64da] bg-[#e8f2ff] text-[#0a47b3] shadow-sm"
                        : "border-[#e6edf4] bg-[#f8fafc] text-slate-600 hover:border-blue-200 hover:bg-[#f5faff]"
                    }`}
                  >
                    <tab.Icon aria-hidden="true" className={`h-4 w-4 ${activeTab === tab.key ? "text-[#1b64da]" : "text-slate-400"}`} />
                    {tab.label}

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        activeTab === tab.key
                          ? "bg-[#1b64da] text-white"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}

              </div>
            </div>

            {/* STATUS FILTER */}

            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 xl:border-l xl:border-slate-200 xl:pl-5">

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </p>
                <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">

                  {(
                    ["pending", "approved", "rejected"] as StatusFilter[]
                  ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      statusFilter === status
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${
                      status === "pending" ? "bg-amber-500" : status === "approved" ? "bg-emerald-500" : "bg-rose-500"
                    }`} />
                    {status}
                  </button>
                  ))}

                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Scope
                </p>
                <div className="flex items-center gap-2 py-2.5 text-sm font-semibold text-slate-600">
                  <Filter className="h-4 w-4 text-slate-400" />
                  All Departments
                </div>
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
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#e6edf4] bg-white p-10 shadow-sm">
              <Loader2 className="w-8 h-8 text-[#1b64da] animate-spin" />
              <p className="text-slate-500 font-medium">
                Loading {activeTab} requests...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-[#e6edf4] bg-white p-10 text-center shadow-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf4fc] flex items-center justify-center text-[#1b64da]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No {statusFilter} requests found
              </h3>

              <p className="mt-2 text-slate-500">
                There are currently no matching {tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase() ?? "requests"}.
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">

              {pagedRequests.map((req, index) => {
                const ts = TYPE_STYLES[req.type];
                const cardKey = `${activeTab}-${req.id}`;

                return (
                  <div
                    key={`${req.requestType}-${req.id}`}
                    id={`request-${cardKey}`}
                    className={`flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm transition-colors hover:border-[#7BBDE8] ${
                      highlightedRequest?.key === cardKey && highlightedRequest.status === statusFilter
                        ? "border-[#1b64da] ring-4 ring-[#1b64da]/30 shadow-lg"
                        : "border-[#e6edf4]"
                    }`}
                  >

                    <div>
                      {highlightedRequest?.key === cardKey && highlightedRequest.status === statusFilter && (
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#1b64da] px-3 py-1 text-xs font-bold text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {highlightedRequest.fromNotification ? "Opened from notification" : "Selected from calendar"}
                        </div>
                      )}

                      {/* EMPLOYEE DETAILS */}

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div className="flex min-w-0 flex-1 items-center gap-3">

                          <div
                            className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${
                              AVATAR_GRADIENTS[(pageStartIndex + index) % AVATAR_GRADIENTS.length]
                            } text-white font-black flex items-center justify-center text-sm shadow-sm`}
                          >
                            {req.initials}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="break-words text-base font-bold text-slate-900">
                                {req.name}
                              </h4>

                              <span className="text-xs font-bold text-blue-700 bg-[#dbe5ff] px-2.5 py-0.5 rounded-full">
                                {req.empId}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-sm text-slate-500" title={req.role}>
                              {req.role}
                            </p>

                          </div>

                        </div>

                        <span
                          className={`shrink-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-bold ${ts.chip}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${ts.dot}`} />
                          {req.type}
                        </span>

                      </div>

                      {/* REQUEST INFORMATION */}

                      <div
                        className="mt-4 rounded-2xl p-4"
                        style={{ backgroundColor: ts.panel }}
                      >

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div className="min-w-0 flex-1">

                            <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">
                              Request Type
                            </span>

                            <span className="mt-1 block break-words text-base font-bold leading-snug text-slate-900">
                              {req.subType}
                            </span>

                          </div>

                          <MetricBubble
                            metric={req.metric}
                            unit={req.metricUnit}
                            color={ts.bubble}
                            text={ts.bubbleText}
                          />

                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/80 pt-3">

                          <span className="flex min-w-0 items-start gap-2 text-sm font-semibold text-slate-700">
                            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                            {req.dateRange}
                          </span>

                          <span className="break-words text-xs font-semibold text-slate-600">
                            {req.quotaInfo}
                          </span>

                        </div>

                      </div>

                      {/* REASON */}

                      <div className="mt-4">

                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Reason / Justification
                        </span>

                        <p className="break-words border-l-2 border-[#7BBDE8] pl-3 text-sm leading-relaxed text-slate-700">
                          &ldquo;{req.reason}&rdquo;
                        </p>

                      </div>

                      {/* APPLIED TIME */}

                      <p className="mt-3 text-xs font-medium text-slate-500">
                        {req.appliedTime}
                      </p>

                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

                      <div className="flex items-center gap-2 text-xs font-semibold">
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
                            type="button"
                            onClick={() =>
                              openDecisionModal(req, "REJECT")
                            }
                            disabled={deciding}
                            className="flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDecisionModal(req, "APPROVE")
                            }
                            disabled={deciding}
                            className="flex items-center gap-2 rounded-full bg-[#1b64da] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1552b5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
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

            {totalRecords > 0 && (
            <nav
              aria-label="Requests pagination"
              className="flex flex-col items-center justify-between gap-3 bg-white px-4 py-3 text-xs text-[#64748b] sm:flex-row rounded-2xl border border-[#e6edf4] shadow-sm"
            >
              <label className="flex items-center gap-2 font-semibold">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#7BBDE8] focus:ring-2 focus:ring-[#7BBDE8]/30"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <span className="font-semibold">
                {pageStartIndex + 1}–{pageEndIndex} of {totalRecords}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-[#eef7fd] hover:text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageItems(currentPage, totalPages).map((item) =>
                  typeof item === "string" ? (
                    <span key={item} className="px-1 text-slate-400" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-label={`Page ${item}`}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors ${
                        item === currentPage
                          ? "border-[#1b64da] bg-[#1b64da] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-[#eef7fd] hover:text-[#1b64da]"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-[#eef7fd] hover:text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
            )}
            </>
          )}

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

export default function RequestsPage() {
  return (
    <Suspense fallback={null}>
      <AdminRequestsApprovals />
    </Suspense>
  );
}
