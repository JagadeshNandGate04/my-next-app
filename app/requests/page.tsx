
"use client";

import React, { useState } from "react";
import Sidebar from "../components/SideBar";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Check,
  X,
} from "lucide-react";

// ---------------- TYPES ----------------

type RequestStream =
  | "leaves"
  | "permissions"
  | "regularizations"
  | "all";

type StatusFilter = "pending" | "approved" | "rejected";

interface ApprovalRequest {
  id: string;
  name: string;
  empId: string;
  role: string;
  department: string;
  initials: string;
  type: "Leave" | "Permission" | "Regularization";
  subType?: string;
  dateRange: string;
  quotaInfo: string;
  appliedTime: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  slaBadge?: string;
  slaUrgent?: boolean;
}

interface CalendarEvent {
  day: number;
  title: string;
  person?: string;
  type: "annual" | "sick" | "permission" | "regularization";
}

// ---------------- SAMPLE DATA ----------------

const requests: ApprovalRequest[] = [
  {
    id: "REQ-101",
    name: "Karthik Raja",
    empId: "#EMP-1048",
    role: "Cloud Infra · Engineering",
    department: "Engineering",
    initials: "KR",
    type: "Leave",
    subType: "Annual Leave (2 Days)",
    dateRange: "09-06 to 10-06-2026",
    quotaInfo: "Quota: 8 Days Left",
    appliedTime: "Applied: 2h ago",
    reason:
      "Attending family wedding reception in hometown Tirunelveli. Standby dev assigned.",
    status: "pending",
  },
  {
    id: "REQ-102",
    name: "Sneha Mohanty",
    empId: "#EMP-1203",
    role: "UI/UX · Product Design",
    department: "Design",
    initials: "SM",
    type: "Permission",
    subType: "2 Hours (14:30 - 16:30)",
    dateRange: "Date: 12-06-2026",
    quotaInfo: "Quota Used: 90/120m",
    appliedTime: "Applied: 4h ago",
    reason:
      "Urgent personal health checkup appointment at Apollo Clinic. Work handover given.",
    status: "pending",
    slaBadge: "Requires SLA Decision",
    slaUrgent: true,
  },
  {
    id: "REQ-103",
    name: "Arun Prakash",
    empId: "#EMP-0982",
    role: "QA Automation · Quality",
    department: "QA",
    initials: "AP",
    type: "Regularization",
    subType: "Missed Out-Punch (18:30)",
    dateRange: "Gate 02 Sync Log",
    quotaInfo: "Shift Date: 05-06-2026",
    appliedTime: "Auto-Flagged",
    reason:
      "Biometric turnstile Reader 02 was offline during evening exit shift. CCTV verified with security.",
    status: "pending",
  },
];

const calendarEvents: Record<number, CalendarEvent[]> = {
  1: [{ day: 1, title: "Sick Leave", person: "N", type: "sick" }],
  2: [{ day: 2, title: "+1 Day Sick", type: "sick" }],
  5: [{ day: 5, title: "Annual Leave", person: "Natalie", type: "annual" }],
  6: [{ day: 6, title: "Annual Leave D2", type: "annual" }],
  9: [{ day: 9, title: "Annual Leave", person: "Karthik", type: "annual" }],
  10: [{ day: 10, title: "Karthik Reception", type: "annual" }],
  12: [{ day: 12, title: "2Hrs Permission", type: "permission" }],
  13: [
    {
      day: 13,
      title: "Late Login Regularized",
      type: "regularization",
    },
  ],
  16: [{ day: 16, title: "1Hr Permission", type: "permission" }],
  23: [{ day: 23, title: "Missed-Punch Req", type: "regularization" }],
};

// ---------------- MAIN PAGE ----------------

export default function AdminRequestsApprovals() {
  const [activeTab, setActiveTab] =
    useState<RequestStream>("leaves");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("pending");

  const [calendarStream, setCalendarStream] =
    useState<RequestStream>("all");

  const [currentMonth, setCurrentMonth] = useState(5);
  const [currentYear, setCurrentYear] = useState(2026);

  const monthName = new Date(
    currentYear,
    currentMonth
  ).toLocaleString("en-US", { month: "long" });

  // Calendar calculation: Monday is the first day of the week.

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

  // The supplied sample events are for June 2026 only.

  const filteredCalendarEvents = (day: number) => {
    if (currentYear !== 2026 || currentMonth !== 5) {
      return [];
    }

    const events = calendarEvents[day] || [];

    if (calendarStream === "all") {
      return events;
    }

    return events.filter((event) => {
      if (calendarStream === "leaves") {
        return (
          event.type === "annual" ||
          event.type === "sick"
        );
      }

      if (calendarStream === "permissions") {
        return event.type === "permission";
      }

      if (calendarStream === "regularizations") {
        return event.type === "regularization";
      }

      return true;
    });
  };

  const visibleEventCount = Object.keys(calendarEvents).reduce(
    (total, day) =>
      total + filteredCalendarEvents(Number(day)).length,
    0
  );

  return (
    <div className="min-h-screen w-full bg-[#f0f6fa] flex font-sans text-slate-800">

      <Sidebar />

      {/* MAIN CONTENT */}

      <main className="flex-1 min-w-0 min-h-screen xl:h-screen xl:overflow-y-auto p-4 md:p-6 xl:p-8">

        <div className="w-full mx-auto flex flex-col gap-6">

          {/* =========================================
              1. TOP METRIC CARDS
          ========================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

            {/* LEAVE REQUESTS */}

            <div className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm hover:shadow-md transition-all">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">

                    <h3 className="text-xl font-bold text-slate-900">
                      Leave Requests
                    </h3>

                    <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-[#eaf2fd] text-[#0284c7] border border-[#d3e7fa]">
                      8 Annual · 6 Sick
                    </span>

                  </div>

                  <div className="mt-3 flex items-baseline gap-3">

                    <span className="text-[44px] leading-none font-extrabold text-[#0284c7]">
                      14
                    </span>

                    <span className="text-base font-medium text-slate-500">
                      Pending Approval
                    </span>

                  </div>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#eaf2fd] border border-[#d3e7fa] flex items-center justify-center text-[#0284c7]">
                  <CalendarIcon className="w-7 h-7" />
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-base font-medium">

                <span className="text-slate-500">
                  42 Approved this month
                </span>

                <span className="px-3 py-1.5 rounded-lg bg-sky-50 text-[#0284c7] font-semibold border border-sky-100">
                  SLA: &lt; 24 Hrs
                </span>

              </div>
            </div>

            {/* PERMISSION REQUESTS */}

            <div className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm hover:shadow-md transition-all">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">

                    <h3 className="text-xl font-bold text-slate-900">
                      Permission Requests
                    </h3>

                    <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-[#eaf2fd] text-[#0284c7] border border-[#d3e7fa]">
                      120m Policy Cap
                    </span>

                  </div>

                  <div className="mt-3 flex items-baseline gap-3">

                    <span className="text-[44px] leading-none font-extrabold text-[#0284c7]">
                      6
                    </span>

                    <span className="text-base font-medium text-slate-500">
                      Pending Review
                    </span>

                  </div>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#eaf2fd] border border-[#d3e7fa] flex items-center justify-center text-[#0284c7]">
                  <Clock className="w-7 h-7" />
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-base font-medium">

                <span className="text-slate-500">
                  18 Approved this month
                </span>

                <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 font-semibold border border-amber-200">
                  SLA: Urgent (Today)
                </span>

              </div>
            </div>

            {/* REGULARIZATION REQUESTS */}

            <div className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm hover:shadow-md transition-all">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">

                    <h3 className="text-xl font-bold text-slate-900">
                      Regularization Requests
                    </h3>

                    <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-[#eaf2fd] text-[#0284c7] border border-[#d3e7fa]">
                      Biometric &amp; In-Out
                    </span>

                  </div>

                  <div className="mt-3 flex items-baseline gap-3">

                    <span className="text-[44px] leading-none font-extrabold text-[#0284c7]">
                      9
                    </span>

                    <span className="text-base font-medium text-slate-500">
                      Pending Reconcile
                    </span>

                  </div>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#eaf2fd] border border-[#d3e7fa] flex items-center justify-center text-[#0284c7]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-base font-medium">

                <span className="text-slate-500">
                  28 Reconciled this cycle
                </span>

                <span className="px-3 py-1.5 rounded-lg bg-sky-50 text-[#0284c7] font-semibold border border-sky-100">
                  SLA: Immediate
                </span>

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
                  14
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
                  6
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
                  9
                </span>
              </button>

            </div>

            {/* STATUS FILTER */}

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center bg-white rounded-xl p-1.5 border border-[#d6e5fb] shadow-sm">

                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-4 py-2.5 rounded-lg text-[15px] font-bold transition-all ${
                    statusFilter === "pending"
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pending (29)
                </button>

                <button
                  onClick={() => setStatusFilter("approved")}
                  className={`px-4 py-2.5 rounded-lg text-[15px] font-bold transition-all ${
                    statusFilter === "approved"
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Approved (88)
                </button>

                <button
                  onClick={() => setStatusFilter("rejected")}
                  className={`px-4 py-2.5 rounded-lg text-[15px] font-bold transition-all ${
                    statusFilter === "rejected"
                      ? "bg-[#0284c7] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Rejected (5)
                </button>

              </div>

              <button className="flex items-center gap-2.5 px-4 py-3 bg-white border border-[#d6e5fb] rounded-xl text-base font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">

                <Filter className="w-5 h-5 text-slate-500" />

                Department Filter

              </button>

            </div>
          </div>

          {/* =========================================
              3. REQUEST CARDS
          ========================================= */}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

            {requests.map((req) => (

              <div
                key={req.id}
                className="bg-white rounded-2xl p-6 border border-[#d6e5fb] shadow-sm flex flex-col justify-between hover:border-[#7BBDE8] hover:shadow-md transition-all min-w-0"
              >

                <div>

                  {/* EMPLOYEE DETAILS */}

                  <div className="flex items-start justify-between gap-3">

                    <div className="flex items-center gap-3.5 min-w-0">

                      <div className="w-14 h-14 shrink-0 rounded-full bg-[#eaf2fd] border border-[#d3e7fa] text-[#0284c7] font-bold flex items-center justify-center text-lg">
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
                        ● Pending Admin Approval
                      </span>

                    </div>

                    <div className="text-right min-w-0">

                      <span className="text-[13px] text-slate-400 block uppercase font-bold tracking-wider">
                        Slot / Range
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

                  <button className="flex items-center gap-2 text-[15px] font-semibold text-slate-500 hover:text-[#0284c7] transition-colors py-2 px-1">

                    <Eye className="w-5 h-5" />

                    Audit History

                  </button>

                  <div className="flex items-center gap-2">

                    <button className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200">

                      <X className="w-4 h-4" />

                      Reject

                    </button>

                    <button className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-xl transition-colors shadow-sm">

                      <Check className="w-4 h-4" />

                      {req.type === "Regularization"
                        ? "Reconcile"
                        : "Approve"}

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

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

                    {/* DAY NUMBER */}

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

                    {/* EVENTS */}

                    <div className="space-y-1.5 mt-2">

                      {events.map((event, eventIndex) => (

                        <div
                          key={`${event.day}-${eventIndex}`}
                          title={`${event.title}${
                            event.person
                              ? ` · ${event.person}`
                              : ""
                          }`}
                          className={`px-2 py-1.5 rounded-md border text-xs md:text-sm font-semibold truncate ${getEventColor(
                            event.type
                          )}`}
                        >
                          {event.title}

                          {event.person && (
                            <span className="hidden xl:inline">
                              {" · "}
                              {event.person}
                            </span>
                          )}

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
                    Annual Leave
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-base font-medium text-slate-700">
                    Sick Leave
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
                Showing {visibleEventCount} active team events
              </div>

            </div>

          </div>

          {/* END CALENDAR */}

        </div>

      </main>

    </div>
  );
}
