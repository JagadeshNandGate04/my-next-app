"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Users,
  Database,
  ShieldCheck,
  Filter,
  RefreshCw,
  Download,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCode,
  X,
  Clock,
  User,
  Eye,
  AlertCircle,
  Loader2,
  FileText,
  RotateCcw,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";

import type {
  RootState,
  AppDispatch,
} from "@/app/store/store";

import {
  fetchAuditLogs,
  fetchAuditLogById,
  setAuditFilters,
  setAuditPage,
  setAuditLimit,
  resetAuditFilters,
  clearSelectedAuditLog,
  clearAuditError,
} from "@/app/store/audit/auditSlice";

// ==================================================
// THEME (same colours as the dashboard)
//   SKY       #7BBDE8
//   SKY LIGHT #bfe0f5
//   BLUE      #1b64da
//   INK       #0f172a
// ==================================================

const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

// ==================================================
// TYPES
// ==================================================

type AuditValue = unknown;

interface AuditLogItem {
  id: number | string;
  actor_id: number | string | null;
  actor_name: string | null;
  actor_emp_code: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | string | null;
  before: AuditValue;
  after: AuditValue;
  reason: string | null;
  created_at: string;
  updated_at?: string;
}

// ==================================================
// HELPERS
// ==================================================

const formatDate = (dateValue: string) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatTime = (dateValue: string) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const getInitials = (name?: string | null) => {
  if (!name) return "SY";

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const getActionLabel = (action: string) => {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getActionBadgeStyle = (action: string) => {
  const normalized = action.toUpperCase();

  if (
    normalized.includes("CREATED") ||
    normalized.includes("CREATE")
  ) {
    return "bg-[#bfe0f5] text-[#0f172a] border-[#7BBDE8]";
  }

  if (
    normalized.includes("UPDATED") ||
    normalized.includes("UPDATE") ||
    normalized.includes("CHANGED")
  ) {
    return "bg-white text-[#1b64da] border-[#7BBDE8]";
  }

  if (
    normalized.includes("APPROVED") ||
    normalized.includes("FINALIZED")
  ) {
    return "bg-[#7BBDE8] text-[#0f172a] border-[#7BBDE8]";
  }

  if (
    normalized.includes("REJECTED") ||
    normalized.includes("DELETED") ||
    normalized.includes("CANCELLED")
  ) {
    return "bg-[#1b64da] text-white border-[#1b64da]";
  }

  return "bg-[#f0f6fa] text-slate-700 border-[#e6edf4]";
};

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "No items";
    }

    return value.every(
      (item) =>
        item === null ||
        ["string", "number", "boolean"].includes(typeof item)
    )
      ? value.map(stringifyValue).join(", ")
      : `${value.length} items`;
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key.replace(/_/g, " ")}: ${stringifyValue(item)}`)
      .join(" · ");
  }

  return String(value);
};

const isObject = (
  value: unknown
): value is Record<string, unknown> => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const csvEscape = (value: unknown) => {
  const text = stringifyValue(value);
  return `"${text.replace(/"/g, '""')}"`;
};

// ==================================================
// COMPONENT: FILLED COUNT CARD (same look as dashboard cards)
// ==================================================

function CountCard({
  label,
  value,
  note,
  color,
  text,
  muted,
  Icon,
  valueClass = "text-[40px]",
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  color: string;
  text: string;
  muted: string;
  Icon: React.ComponentType<{ className?: string }>;
  valueClass?: string;
}) {
  return (
    <div
      className="relative flex min-h-[170px] flex-col rounded-[32px] p-5 shadow-sm"
      style={{ backgroundColor: color, color: text }}
    >
      <p className="max-w-[65%] text-xs font-bold leading-tight">
        {label}
      </p>

      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/60">
        <Icon className="h-4 w-4" />
      </span>

      <p className={`${valueClass} mt-auto pt-4 font-black leading-none`}>{value}</p>

      <p className={`mt-4 text-xs font-medium leading-snug ${muted}`}>
        {note}
      </p>
    </div>
  );
}

// ==================================================
// COMPONENT: CHANGE COMPARISON
// ==================================================

function ChangeComparison({
  before,
  after,
}: {
  before: AuditValue;
  after: AuditValue;
}) {
  const beforeExists = before !== null && before !== undefined;
  const afterExists = after !== null && after !== undefined;

  const changes = useMemo(() => {
    const oldObject = isObject(before)
      ? before
      : beforeExists
        ? { value: before }
        : {};
    const newObject = isObject(after)
      ? after
      : afterExists
        ? { value: after }
        : {};

    const keys = Array.from(
      new Set([
        ...Object.keys(oldObject),
        ...Object.keys(newObject),
      ])
    );

    return keys.map((key) => {
      const oldValue = oldObject[key];
      const newValue = newObject[key];

      return {
        key,
        oldValue,
        newValue,
        changed:
          JSON.stringify(oldValue) !==
          JSON.stringify(newValue),
        added: !(key in oldObject),
        removed: !(key in newObject),
      };
    });
  }, [before, after, beforeExists, afterExists]);

  if (!beforeExists && !afterExists) {
    return (
      <div className="rounded-2xl border border-[#e6edf4] bg-[#f0f6fa] p-5 text-sm text-slate-500">
        No before or after data is available for this event.
      </div>
    );
  }

  const changedCount = changes.filter(
    (item) => item.changed
  ).length;

  return (
    <div className="space-y-3">
      {!beforeExists && afterExists && (
        <div className="flex items-center gap-2 text-[#1b64da] font-bold text-sm">
          <Check className="w-4 h-4" />
          New record created
        </div>
      )}

      {beforeExists && !afterExists && (
        <div className="font-bold text-sm text-[#0f172a]">
          Record removed or no after-state recorded
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {beforeExists && afterExists ? "Field comparison" : "Record details"}
        </span>

        <span className="text-xs font-bold text-[#1b64da]">
          {changedCount} changed field
          {changedCount !== 1 ? "s" : ""}
        </span>
      </div>

      {changes.length === 0 ? (
        <div className="rounded-xl bg-[#f0f6fa] border border-[#e6edf4] p-4 text-sm text-slate-500">
          No fields available for comparison.
        </div>
      ) : (
        changes.map((item) => (
          <div
            key={item.key}
            className={`rounded-2xl border p-3 ${
              item.changed
                ? "border-[#7BBDE8] bg-[#bfe0f5]/20"
                : "border-[#e6edf4] bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-700 break-all capitalize">
                {item.key.replace(/_/g, " ")}
              </span>

              {item.changed ? (
                <span className="text-xs font-bold uppercase text-white bg-[#1b64da] px-2 py-1 rounded-full shrink-0">
                  Changed
                </span>
              ) : (
                <span className="text-xs text-slate-400 uppercase shrink-0">
                  Unchanged
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl bg-white border border-[#bfe0f5] p-2 min-w-0">
                <p className="text-xs uppercase font-bold text-slate-500 mb-1">
                  Before
                </p>

                <p className="text-xs text-slate-700 break-words">
                  {item.removed
                    ? "—"
                    : stringifyValue(item.oldValue)}
                </p>
              </div>

              <div className="rounded-xl bg-[#bfe0f5]/60 border border-[#7BBDE8] p-2 min-w-0">
                <p className="text-xs uppercase font-bold text-[#1b64da] mb-1">
                  After
                </p>

                <p className="text-xs text-slate-700 break-words">
                  {item.added
                    ? "—"
                    : stringifyValue(item.newValue)}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ==================================================
// MAIN PAGE
// ==================================================

export default function AuditLogsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ==================================================
  // HYDRATION FIX
  // ==================================================

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redux audit state
  const {
    logs,
    selectedLog,
    pagination,
    filters,
    listLoading,
    detailLoading,
    error,
    detailError,
  } = useSelector((state: RootState) => state.audit);

  // Authentication state
  const token = useSelector(
    (state: RootState) => state.auth.token
  );

  // Local UI state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Immediately show the clicked row while detail API loads.
  const [clickedLog, setClickedLog] =
    useState<AuditLogItem | null>(null);

  // Local filter input values.
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ==================================================
  // FETCH AUDIT LOGS
  // ==================================================

  useEffect(() => {
    if (!token) {
      return;
    }

    dispatch(fetchAuditLogs(filters));
  }, [dispatch, filters, token]);

  // ==================================================
  // REFRESH
  // ==================================================

  const handleRefresh = () => {
    dispatch(clearAuditError());
    dispatch(fetchAuditLogs(filters));
  };

  // ==================================================
  // FILTER HANDLERS
  // ==================================================

  const handleApplyFilters = () => {
    if (
      actorIdFilter.trim() &&
      !/^\d+$/.test(actorIdFilter.trim())
    ) {
      return;
    }

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      return;
    }

    dispatch(
      setAuditFilters({
        action: actionFilter.trim(),
        entity_type: entityFilter.trim(),
        actor_id: actorIdFilter.trim(),
        from_date: fromDate,
        to_date: toDate,
      })
    );
  };

  const handleClearFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setActorIdFilter("");
    setFromDate("");
    setToDate("");

    dispatch(resetAuditFilters());
  };

  const handleLimitChange = (
    value: number
  ) => {
    dispatch(setAuditLimit(value));
  };

  // ==================================================
  // PAGINATION
  // ==================================================

  const handlePreviousPage = () => {
    if (filters.page > 1) {
      dispatch(setAuditPage(filters.page - 1));
    }
  };

  const handleNextPage = () => {
    if (filters.page < pagination.totalPages) {
      dispatch(setAuditPage(filters.page + 1));
    }
  };

  // ==================================================
  // SELECT AUDIT LOG
  // ==================================================

  const handleSelectLog = (
    log: AuditLogItem
  ) => {
    setClickedLog(log);
    setDrawerOpen(true);

    // Clear the previous selected record.
    dispatch(clearSelectedAuditLog());

    // Fetch complete record from backend.
    dispatch(fetchAuditLogById(log.id));
  };

  // Use the clicked row until the detail request succeeds.
  const activeLog = selectedLog || clickedLog;

  // ==================================================
  // CLOSE DRAWER
  // ==================================================

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setClickedLog(null);

    dispatch(clearSelectedAuditLog());
  }, [dispatch]);

  // Close drawer using Escape key.
  useEffect(() => {
    if (!drawerOpen) return;

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [drawerOpen, closeDrawer]);

  // ==================================================
  // EXPORT CURRENT PAGE AS CSV
  // ==================================================

  const handleExport = () => {
    if (logs.length === 0) return;

    const headers = [
      "ID",
      "Actor ID",
      "Actor Name",
      "Employee Code",
      "Action",
      "Entity Type",
      "Entity ID",
      "Reason",
      "Created At",
      "Before",
      "After",
    ];

    const rows = logs.map((log) => [
      log.id,
      log.actor_id,
      log.actor_name || "",
      log.actor_emp_code || "",
      log.action,
      log.entity_type || "",
      log.entity_id ?? "",
      log.reason || "",
      log.created_at,
      JSON.stringify(log.before),
      JSON.stringify(log.after),
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) =>
        row.map(csvEscape).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `audit-logs-page-${filters.page}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ==================================================
  // KPI VALUES FROM CURRENT PAGE
  // ==================================================

  const uniqueActors = useMemo(() => {
    return new Set(
      logs
        .filter((log) => log.actor_id !== null)
        .map((log) => String(log.actor_id))
    ).size;
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    return new Set(
      logs
        .map((log) => log.entity_type)
        .filter(Boolean)
    ).size;
  }, [logs]);

  const hasFilters = Boolean(
    actionFilter ||
      entityFilter ||
      actorIdFilter ||
      fromDate ||
      toDate
  );

  const invalidActorId =
    Boolean(actorIdFilter.trim()) &&
    !/^\d+$/.test(actorIdFilter.trim());

  const invalidDateRange =
    Boolean(fromDate && toDate && fromDate > toDate);

  // ==================================================
  // HYDRATION-SAFE INITIAL RENDER
  // ==================================================

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#f0f6fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1b64da]" />
          <p className="text-sm font-medium text-slate-500">
            Loading audit logs...
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-[#0f172a] font-sans antialiased selection:bg-[#7BBDE8]/30">
      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 py-4 sm:py-6 lg:py-8">
        <div className="mx-auto w-full max-w-[2400px] space-y-6 px-3 sm:px-5 lg:px-6">

          {/* PAGE HEADER */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#7BBDE8] flex items-center justify-center text-[#0f172a]">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
                    System Audit Logs
                  </h1>

                  <p className="text-sm text-slate-500 mt-1">
                    Monitor administrative actions and system activity.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={listLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#bfe0f5] text-xs font-bold text-[#0f172a] hover:bg-[#bfe0f5]/40 shadow-sm disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#1b64da] ${
                    listLoading ? "animate-spin" : ""
                  }`}
                />

                {listLoading ? "Loading..." : "Refresh Logs"}
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-md shadow-[#1b64da]/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export Current Page
              </button>
            </div>
          </div>

          {/* AUTHENTICATION MESSAGE */}
          {!token && (
            <div className="rounded-2xl border border-[#7BBDE8] bg-[#bfe0f5] p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#1b64da] shrink-0" />

              <div>
                <p className="text-sm font-bold text-[#0f172a]">
                  Authentication required
                </p>

                <p className="text-xs text-slate-700 mt-1">
                  Please sign in again to access audit logs.
                </p>
              </div>
            </div>
          )}

          {/* API ERROR */}
          {error && (
            <div className="rounded-2xl border border-[#1b64da] bg-[#1b64da] p-4 flex items-start gap-3 text-white">
              <AlertCircle className="w-5 h-5 shrink-0" />

              <div className="flex-1">
                <p className="text-sm font-bold">
                  Unable to load audit logs
                </p>

                <p className="text-xs text-white/80 mt-1">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="text-xs font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI CARDS (filled like the dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            <CountCard
              label="Total Audit Events"
              value={pagination.total.toLocaleString("en-IN")}
              note="Matching current filters"
              color={SKY}
              text={INK}
              muted="text-black/40"
              Icon={Activity}
            />

            <CountCard
              label="Actors on This Page"
              value={uniqueActors}
              note="Unique actor IDs"
              color={SKY_LIGHT}
              text={INK}
              muted="text-black/40"
              Icon={Users}
            />

            <CountCard
              label="Entities on This Page"
              value={uniqueEntities}
              note="Unique entity types"
              color={BLUE}
              text="#ffffff"
              muted="text-white/60"
              Icon={Database}
            />

            <CountCard
              label="Security Filtering"
              value="API Enabled"
              note="Sensitive JSON fields filtered"
              color={SKY}
              text={INK}
              muted="text-black/40"
              Icon={ShieldCheck}
              valueClass="text-[26px]"
            />
          </div>

          {/* FILTER TOOLBAR */}
          <section className="bg-white border border-[#e6edf4] rounded-[32px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#1b64da]" />

                <h2 className="text-sm font-black text-[#0f172a]">
                  Filter Audit Stream
                </h2>
              </div>

              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-slate-500 hover:text-[#1b64da] flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

              {/* ACTION */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Action Type
                </label>

                <input
                  type="text"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="e.g. EMPLOYEE_UPDATED"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                />
              </div>

              {/* ENTITY */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Entity Type
                </label>

                <input
                  type="text"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  placeholder="e.g. users"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                />
              </div>

              {/* ACTOR ID */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Actor ID
                </label>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                  <input
                    type="text"
                    value={actorIdFilter}
                    onChange={(e) => setActorIdFilter(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                  />
                </div>

                {invalidActorId && (
                  <p className="text-xs text-[#1b64da] font-semibold mt-1">
                    Actor ID must contain numbers only.
                  </p>
                )}
              </div>

              {/* FROM DATE */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                />
              </div>

              {/* TO DATE */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                />

                {invalidDateRange && (
                  <p className="text-xs text-[#1b64da] font-semibold mt-1">
                    To Date cannot be earlier than From Date.
                  </p>
                )}
              </div>

              {/* LIMIT */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Records Per Page
                </label>

                <select
                  value={filters.limit}
                  onChange={(e) =>
                    handleLimitChange(Number(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                >
                  <option value={10}>10 records</option>
                  <option value={25}>25 records</option>
                  <option value={50}>50 records</option>
                  <option value={100}>100 records</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={invalidActorId || invalidDateRange}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                Apply Filters
              </button>
            </div>
          </section>

          {/* AUDIT TABLE */}
          <section className="bg-white border border-[#e6edf4] rounded-[32px] shadow-sm overflow-hidden">

            <div className="p-5 border-b border-[#e6edf4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#bfe0f5] flex items-center justify-center text-[#1b64da]">
                  <FileText className="w-4 h-4" />
                </div>

                <div>
                  <h3 className="font-black text-lg text-[#0f172a]">
                    Audit Event Ledger
                  </h3>

                  <p className="text-xs text-slate-500">
                    Chronological administrative activity
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Sorted by timestamp · Newest first
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">

                <thead>
                  <tr className="bg-[#f0f6fa] border-b border-[#bfe0f5] text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                    <th className="py-4 px-5">Event / Action</th>
                    <th className="py-4 px-4">Entity</th>
                    <th className="py-4 px-4">Actor</th>
                    <th className="py-4 px-4">Reason</th>
                    <th className="py-4 px-5">Timestamp</th>
                    <th className="py-4 px-4 text-center">View</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e6edf4] text-xs">

                  {listLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center bg-white">
                        <Loader2 className="w-7 h-7 animate-spin text-[#1b64da] mx-auto" />

                        <p className="text-sm text-slate-500 mt-3">
                          Loading audit logs...
                        </p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center bg-white">
                        <Database className="w-8 h-8 text-[#7BBDE8] mx-auto" />

                        <p className="font-bold text-slate-700 mt-3">
                          No audit records found
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          Try changing or clearing your filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, index) => {
                      const isSelected =
                        activeLog &&
                        String(activeLog.id) === String(log.id);

                      return (
                        <tr
                          key={log.id}
                          onClick={() => handleSelectLog(log)}
                          className={`cursor-pointer transition-colors duration-150 border-l-[3px] ${
                            isSelected
                              ? "bg-[#bfe0f5]/60 border-l-[#1b64da] hover:bg-[#bfe0f5]/70"
                              : index % 2 === 0
                              ? "bg-white border-l-transparent hover:bg-[#bfe0f5]/30"
                              : "bg-[#f0f6fa]/60 border-l-transparent hover:bg-[#bfe0f5]/30"
                          }`}
                        >
                          {/* ACTION */}
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-xs font-bold border whitespace-nowrap ${getActionBadgeStyle(
                                log.action
                              )}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {log.action}
                            </span>
                          </td>

                          {/* ENTITY */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="font-bold text-[#0f172a]">
                              {log.entity_type || "—"}
                            </p>
                          </td>

                          {/* ACTOR */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#1b64da] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                {getInitials(log.actor_name)}
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold text-[#0f172a] whitespace-nowrap">
                                  {log.actor_name || "Unknown Actor"}
                                </p>

                                <p className="text-xs text-slate-500 font-mono">
                                  {log.actor_emp_code ||
                                    (log.actor_id
                                      ? `ID: ${log.actor_id}`
                                      : "System")}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* REASON */}
                          <td className="py-4 px-4 max-w-[220px]">
                            <p
                              className="text-slate-600 line-clamp-2"
                              title={log.reason || ""}
                            >
                              {log.reason || "No reason provided"}
                            </p>
                          </td>

                          {/* TIMESTAMP */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="font-bold text-[#0f172a]">
                              {formatDate(log.created_at)}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              {formatTime(log.created_at)} IST
                            </p>
                          </td>

                          {/* VIEW */}
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              title="View audit details"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectLog(log);
                              }}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-[#bfe0f5] border border-[#7BBDE8] text-[#1b64da] hover:bg-[#1b64da] hover:text-white hover:border-[#1b64da] transition-all duration-150"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="p-4 bg-[#f0f6fa] border-t border-[#e6edf4] flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                Showing{" "}
                <strong className="text-[#0f172a]">
                  {pagination.total === 0
                    ? 0
                    : (filters.page - 1) * filters.limit + 1}
                </strong>
                {" - "}
                <strong className="text-[#0f172a]">
                  {Math.min(
                    filters.page * filters.limit,
                    pagination.total
                  )}
                </strong>
                {" of "}
                <strong className="text-[#0f172a]">
                  {pagination.total}
                </strong>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={filters.page <= 1 || listLoading}
                  onClick={handlePreviousPage}
                  className="w-9 h-9 rounded-full border border-[#bfe0f5] bg-white flex items-center justify-center text-slate-600 hover:bg-[#bfe0f5]/50 hover:text-[#1b64da] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[#0f172a] px-2">
                  Page {filters.page} of{" "}
                  {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  type="button"
                  disabled={
                    filters.page >= pagination.totalPages ||
                    listLoading ||
                    pagination.totalPages === 0
                  }
                  onClick={handleNextPage}
                  className="w-9 h-9 rounded-full border border-[#bfe0f5] bg-white flex items-center justify-center text-slate-600 hover:bg-[#bfe0f5]/50 hover:text-[#1b64da] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ==================================================
          SLIDE-OVER DRAWER
      ================================================== */}

      {drawerOpen && (
        <div className="fixed inset-0 z-[100]">

          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close audit details"
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity"
          />

          {/* DRAWER */}
          <aside
            className="absolute right-0 top-0 h-full w-full sm:max-w-[650px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
            aria-label="Audit event details"
          >

            {/* DRAWER HEADER */}
            <div className="p-5 sm:p-6 border-b border-[#e6edf4] bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#bfe0f5] text-[#1b64da] flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="font-black text-lg text-[#0f172a]">
                    Event Diff Inspector
                  </h2>

                  <p className="text-xs text-slate-500 truncate">
                    Audit Record #{activeLog?.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                className="w-9 h-9 rounded-full bg-[#f0f6fa] hover:bg-[#bfe0f5] flex items-center justify-center text-slate-600 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DRAWER CONTENT */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

              {detailLoading && (
                <div className="flex items-center justify-center gap-3 py-4 text-sm text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1b64da]" />
                  Loading complete audit record...
                </div>
              )}

              {detailError && (
                <div className="rounded-2xl border border-[#1b64da] bg-[#1b64da] p-3 flex gap-2 text-xs text-white">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {detailError}
                </div>
              )}

              {activeLog && (
                <>
                  {/* ACTION */}
                  <div className="space-y-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${getActionBadgeStyle(
                        activeLog.action
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {getActionLabel(activeLog.action)}
                    </span>

                    <h3 className="text-xl font-black text-[#0f172a] break-words">
                      {activeLog.entity_type || "Entity"}
                    </h3>

                    <p className="text-xs text-slate-500">
                      Record ID: {activeLog.id}
                    </p>
                  </div>

                  {/* EVENT INFORMATION */}
                  <div className="rounded-3xl border border-[#e6edf4] bg-[#f0f6fa] p-4 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Event Information
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold uppercase">
                            Performed By
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-800">
                          {activeLog.actor_name || "Unknown Actor"}
                        </p>

                        <p className="text-xs text-slate-500 mt-0.5">
                          {activeLog.actor_emp_code ||
                            (activeLog.actor_id
                              ? `Actor ID: ${activeLog.actor_id}`
                              : "System")}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold uppercase">
                            Date & Time
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-800">
                          {formatDate(activeLog.created_at)}
                        </p>

                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatTime(activeLog.created_at)} IST
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                          Actor ID
                        </p>

                        <p className="text-sm font-bold text-slate-800">
                          {activeLog.actor_id ?? "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                          Entity Type
                        </p>

                        <p className="text-sm font-bold text-slate-800">
                          {activeLog.entity_type || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* REASON */}
                  <div className="rounded-3xl border border-[#7BBDE8] bg-[#bfe0f5]/40 p-4">
                    <p className="text-xs uppercase tracking-wider font-bold text-[#1b64da] mb-2">
                      Reason / Context
                    </p>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {activeLog.reason ||
                        "No reason provided for this action."}
                    </p>
                  </div>

                  {/* BEFORE / AFTER */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-800">
                        State Modification
                      </h4>

                      <span className="text-xs font-mono text-slate-400">
                        {activeLog.entity_type || "Entity"}
                      </span>
                    </div>

                    <ChangeComparison
                      before={activeLog.before}
                      after={activeLog.after}
                    />
                  </div>

                </>
              )}
            </div>

            {/* DRAWER FOOTER */}
            {activeLog && (
              <div className="p-4 sm:p-5 border-t border-[#e6edf4] bg-white flex justify-end">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="px-6 py-2.5 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-md shadow-[#1b64da]/20"
                  >
                    Close
                  </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}