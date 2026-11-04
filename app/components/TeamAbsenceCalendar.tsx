"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import type {
  LeaveRequest,
  PermissionRequest,
  RegularizationRequest,
  RequestStatus,
} from "../store/requests/requestSlice";

type CalendarStream = "all" | "leaves" | "permissions" | "regularizations";
type CalendarEventType = "annual" | "permission" | "regularization";

interface CalendarEvent {
  date: string;
  title: string;
  person: string;
  type: CalendarEventType;
  status: RequestStatus;
}

interface CalendarRequests {
  leaves: LeaveRequest[];
  permissions: PermissionRequest[];
  regularizations: RegularizationRequest[];
}

const toDateKey = (value?: string | null): string => {
  if (!value) return "";

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const getDateRangeKeys = (fromDate: string, toDate: string): string[] => {
  const startKey = toDateKey(fromDate);
  const endKey = toDateKey(toDate);
  if (!startKey || !endKey || startKey > endKey) return [];

  const dates: string[] = [];
  const current = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const getEventColor = (type: CalendarEventType): string => {
  switch (type) {
    case "annual":
      return "bg-[#dbe7ff] text-blue-800 border-blue-200";
    case "permission":
      return "bg-[#d3ebfa] text-sky-800 border-sky-200";
    case "regularization":
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
};

const initialCalendarRequests: CalendarRequests = {
  leaves: [],
  permissions: [],
  regularizations: [],
};

export default function TeamAbsenceCalendar() {
  const storeAuthToken = useSelector((state: RootState) => state.auth.token);
  const [calendarStream, setCalendarStream] = useState<CalendarStream>("all");
  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentYear, setCurrentYear] = useState(2026);
  const [todayKey, setTodayKey] = useState("");
  const [calendarRequests, setCalendarRequests] =
    useState<CalendarRequests>(initialCalendarRequests);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

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
        const headers = { Authorization: `Bearer ${storeAuthToken}` };
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

        const uniqueById = <T extends { id: number }>(items: T[]): T[] =>
          Array.from(new Map(items.map((item) => [item.id, item])).values());

        if (!cancelled) {
          setCalendarRequests({
            leaves: uniqueById([...pendingLeaves, ...approvedLeaves, ...rejectedLeaves]),
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
        if (!cancelled) setCalendarLoading(false);
      }
    };

    void fetchCalendarRequests();

    return () => {
      cancelled = true;
    };
  }, [storeAuthToken]);

  const monthName = new Date(currentYear, currentMonth).toLocaleString("en-US", {
    month: "long",
  });
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array(mondayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const calendarWeeks = calendarDays.length / 7;

  const allCalendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];

    calendarRequests.leaves.forEach((request) => {
      const person = request.employee_name || "Unknown Employee";
      getDateRangeKeys(request.from_date, request.to_date).forEach((date) => {
        events.push({ date, title: "Leave", person, type: "annual", status: request.status });
      });
    });

    calendarRequests.permissions.forEach((request) => {
      const date = toDateKey(request.perm_date);
      if (date) {
        events.push({
          date,
          title: `${request.minutes}m Permission`,
          person: request.employee_name || "Unknown Employee",
          type: "permission",
          status: request.status,
        });
      }
    });

    calendarRequests.regularizations.forEach((request) => {
      const date = toDateKey(request.work_date);
      if (date) {
        events.push({
          date,
          title: `Regularization · ${request.type.replace(/_/g, " ")}`,
          person: request.employee?.name || "Unknown Employee",
          type: "regularization",
          status: request.status,
        });
      }
    });

    return events;
  }, [calendarRequests]);

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const visibleCalendarEvents = useMemo(
    () =>
      allCalendarEvents.filter((event) => {
        if (!event.date.startsWith(monthPrefix)) return false;
        if (calendarStream === "leaves") return event.type === "annual";
        if (calendarStream === "permissions") return event.type === "permission";
        if (calendarStream === "regularizations") {
          return event.type === "regularization";
        }
        return true;
      }),
    [allCalendarEvents, calendarStream, monthPrefix]
  );

  const calendarCounts = {
    leave: visibleCalendarEvents.filter((event) => event.type === "annual").length,
    permission: visibleCalendarEvents.filter((event) => event.type === "permission").length,
    regularization: visibleCalendarEvents.filter(
      (event) => event.type === "regularization"
    ).length,
  };

  const changeMonth = (direction: number) => {
    const nextDate = new Date(currentYear, currentMonth + direction, 1);
    setCurrentMonth(nextDate.getMonth());
    setCurrentYear(nextDate.getFullYear());
  };

  const getEventsForDay = (day: number) => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return visibleCalendarEvents.filter((event) => event.date === dateKey);
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e6edf4] bg-white shadow-sm">
      <header className="flex flex-col justify-between gap-4 border-b border-[#e8eef5] px-5 py-5 md:px-8 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
            Team Absence &amp; Leave Calendar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Company-wide planned leave, permission hours &amp; regularizations
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

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="flex max-w-full items-center overflow-x-auto rounded-full border border-[#e6edf4] bg-white p-1.5 text-sm shadow-sm">
            {(["all", "leaves", "permissions", "regularizations"] as CalendarStream[]).map(
              (stream) => (
                <button
                  key={stream}
                  type="button"
                  onClick={() => setCalendarStream(stream)}
                  aria-pressed={calendarStream === stream}
                  className={`whitespace-nowrap rounded-full px-3 py-2 font-semibold capitalize transition-colors sm:px-4 ${
                    calendarStream === stream
                      ? "bg-[#1b64da] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {stream === "all" ? "All" : stream === "leaves" ? "Leaves" : stream}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#e6edf4] bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-full p-1.5 text-slate-500 hover:bg-[#eef4fa] hover:text-[#1b64da]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[124px] text-center">
              {monthName} {currentYear}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-full p-1.5 text-slate-500 hover:bg-[#eef4fa] hover:text-[#1b64da]"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {calendarError && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {calendarError}
        </div>
      )}

      <div className="overflow-x-auto px-3 pb-5 pt-4 sm:px-5 md:px-6">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-2 pb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
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
            style={{ gridTemplateRows: `repeat(${calendarWeeks}, minmax(132px, 1fr))` }}
          >
            {calendarDays.map((day, index) => {
              if (!day) return <div key={`${currentYear}-${currentMonth}-${index}`} />;

              const events = getEventsForDay(day);
              const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
                day
              ).padStart(2, "0")}`;
              const isToday = dateKey === todayKey;
              const isWeekend = index % 7 >= 5;

              return (
                <div
                  key={dateKey}
                  className={`requests-calendar-cell relative flex min-h-[132px] flex-col rounded-2xl border p-3 transition-colors ${
                    events.length > 0
                      ? "border-[#cfe3f5] bg-[#f3f9fe]"
                      : isWeekend
                        ? "border-transparent bg-[#f5faff]"
                        : "border-[#eef2f7] bg-white"
                  } ${isToday ? "ring-2 ring-[#1b64da] ring-offset-1" : ""}`}
                  style={{ animationDelay: `${index * 18}ms` }}
                >
                  <div className="flex shrink-0 items-center justify-between">
                    <span
                      className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-black ${
                        isToday ? "bg-[#1b64da] text-white" : "text-slate-800"
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
                        <span className="hidden text-[11px] font-medium text-slate-400 xl:block">
                          Weekend
                        </span>
                      )
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {events.slice(0, 2).map((event, eventIndex) => (
                      <div
                        key={`${event.date}-${eventIndex}`}
                        title={`${event.title} · ${event.person} · ${event.status}`}
                        className={`truncate rounded-lg border px-2 py-1 text-[11px] font-semibold md:text-xs ${getEventColor(
                          event.type
                        )}`}
                      >
                        {event.title}
                        <span className="hidden xl:inline">{" · "}{event.person}</span>
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
      </div>

      <footer className="flex flex-col items-start justify-between gap-3 border-t border-[#e8eef5] bg-white px-5 py-4 md:flex-row md:items-center md:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            <span className="text-sm font-medium text-slate-700">Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#7BBDE8]" />
            <span className="text-sm font-medium text-slate-700">Permission Hours</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-slate-700">Regularization</span>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500" aria-live="polite">
          {calendarLoading
            ? "Loading team events..."
            : `Showing ${visibleCalendarEvents.length} team events`}
        </p>
      </footer>
    </section>
  );
}
