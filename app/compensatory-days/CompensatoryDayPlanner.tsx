"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/app/store/store";
import {
  fetchEmployees,
  type Employee,
} from "@/app/store/employee/employeeSlice";
import type { Holiday } from "@/app/store/settings/settingsSlice";
import { createWorkdaySwap, deleteWorkdaySwap, fetchWorkdaySwaps, type WorkdaySwap } from "@/app/store/settings/workdaySwapSlice";
import { adjacentMonth } from "./calendarNavigation";
import DeleteSwapModal from "./DeleteSwapModal";

interface CompensatoryDayPlannerProps {
  holidays: Holiday[];
  weeklyOffDays: number[];
  year: number;
  initialMonth: number;
  onChangeYear: (year: number, month: number) => void;
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (value: number) => String(value).padStart(2, "0");

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const errorMessage = (error: unknown) =>
  typeof error === "object" && error !== null && "message" in error &&
  typeof error.message === "string"
    ? error.message
    : "The request failed. Refresh the list before trying again.";

export default function CompensatoryDayPlanner({
  holidays,
  weeklyOffDays,
  year,
  initialMonth,
  onChangeYear,
}: CompensatoryDayPlannerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { employees, loading, error, pagination } = useSelector(
    (state: RootState) => state.employees,
  );
  const { swaps, year: swapsYear, loading: swapsLoading, error: swapsError, creating, deletingId } =
    useSelector((state: RootState) => state.workdaySwaps);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(year, initialMonth, 1),
  );
  const [workDate, setWorkDate] = useState("");
  const [compOffDate, setCompOffDate] = useState("");
  const [reason, setReason] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [formError, setFormError] = useState("");
  const [swapSearch, setSwapSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [selectedSwap, setSelectedSwap] = useState<WorkdaySwap | null>(null);
  const [formClosed, setFormClosed] = useState(false);
  const formVisible = Boolean(workDate && compOffDate && !formClosed);
  const deleteInFlight = useRef(false);
  const calendarHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void dispatch(fetchWorkdaySwaps(year));
  }, [dispatch, year]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void dispatch(fetchEmployees({ page: employeePage, limit: 20, search: employeeSearch }));
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [dispatch, employeePage, employeeSearch]);

  const holidayNames = useMemo(
    () =>
      new Map(
        holidays.map((holiday) => [
          holiday.holiday_date.slice(0, 10),
          holiday.name,
        ]),
      ),
    [holidays],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return employees
      .filter((employee) => employee.status === "ACTIVE")
      .filter(
        (employee) =>
          !query ||
          employee.name.toLowerCase().includes(query) ||
          employee.emp_code.toLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, employeeSearch]);

  const firstWeekday = (calendarMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarDays = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const toggleEmployee = (employee: Employee) => {
    setSelectedEmployees((current) =>
      current.some((item) => item.id === employee.id)
        ? current.filter((item) => item.id !== employee.id)
        : [...current, employee],
    );
    setFormError("");
  };

  const isOffDate = (value: string) => {
    if (holidayNames.has(value)) return true;
    const [year, month, day] = value.split("-").map(Number);
    return weeklyOffDays.includes(new Date(year, month - 1, day).getDay());
  };

  const handleCreateSwap = async () => {
    setFormError("");
    setNotice("");
    if (!workDate) {
      setFormError("Select a holiday or weekly-off date first.");
      return;
    }
    if (workDate.startsWith(`${year}-`) && !isOffDate(workDate)) {
      setFormError("The selected work date is no longer a holiday or weekly off.");
      return;
    }
    if (selectedEmployees.length === 0) {
      setFormError("Select at least one employee.");
      return;
    }
    if (!compOffDate) {
      setFormError("Choose the working day they will take off.");
      return;
    }
    if (!compOffDate.startsWith(`${year}-`)) {
      setFormError(`Choose a compensatory date in ${year}.`);
      return;
    }
    if (compOffDate === workDate || isOffDate(compOffDate)) {
      setFormError(
        "The compensatory day must be a different date that is normally a working day.",
      );
      return;
    }
    if (!reason.trim()) {
      setFormError("Enter the reason for this arrangement.");
      return;
    }

    try {
      await dispatch(createWorkdaySwap({
        holiday_date: compOffDate,
        replacement_date: workDate,
        user_ids: selectedEmployees.map((employee) => employee.id),
        reason: reason.trim(),
      })).unwrap();
      setSelectedEmployees([]);
      setCompOffDate("");
      setWorkDate("");
      setReason("");
      setFormClosed(false);
      setNotice("Workday swap created successfully.");
      void dispatch(fetchWorkdaySwaps(year));
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const handleDeleteSwap = async () => {
    if (!selectedSwap || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteError("");
    setNotice("");
    try {
      await dispatch(deleteWorkdaySwap(selectedSwap.id)).unwrap();
      setSelectedSwap(null);
      setNotice("Workday swap deleted successfully.");
      void dispatch(fetchWorkdaySwaps(year));
    } catch (error) {
      setDeleteError(errorMessage(error));
    } finally {
      deleteInFlight.current = false;
    }
  };

  const changeMonth = (direction: -1 | 1) => {
    const next = adjacentMonth(year, calendarMonth.getMonth(), direction);
    if (next.year !== year) {
      onChangeYear(next.year, next.month);
    } else {
      setCalendarMonth(new Date(next.year, next.month, 1));
    }
  };

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const visibleSwaps = swapsYear === year ? swaps : [];
  const filteredSwaps = visibleSwaps.filter((swap) =>
    `${swap.employees.map((employee) => `${employee.name} ${employee.emp_code}`).join(" ")} ${swap.reason}`
      .toLowerCase()
      .includes(swapSearch.trim().toLowerCase()),
  );

  return (
    <section className="overflow-hidden rounded-[32px] border border-[#cbdff0] bg-white shadow-lg shadow-blue-900/5">
      <div className="border-b border-[#cbdff0] bg-gradient-to-r from-[#e7f4fd] to-white p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1b64da] text-white shadow-sm">
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#0f172a]">
              Compensatory Day Planner
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Select the day employees will work and the working day they will
              take off, in either order.
            </p>
          </div>
        </div>
      </div>

      <div className={`grid items-start gap-5 p-4 sm:p-6 ${formVisible ? "xl:grid-cols-[minmax(0,1fr)_minmax(320px,556px)]" : ""}`}>
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 xl:col-span-full">{notice}</p>}

        <div className="min-w-0 overflow-hidden rounded-[28px] border border-[#e6edf4] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-[#e8eef5] px-5 py-5 md:px-8 lg:flex-row lg:items-center">
            <div>
              <h3 ref={calendarHeadingRef} tabIndex={-1} className="text-xl font-extrabold text-slate-900 md:text-2xl">
                1. Choose the dates
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select an off day to work and a working day to take off. Click
                a selected date again to remove it.
              </p>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full border border-[#e6edf4] bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                disabled={creating || deletingId !== null}
                aria-label="Previous month"
                className="rounded-full p-1.5 text-slate-500 hover:bg-[#eef4fa] hover:text-[#1b64da] disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[124px] text-center">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                disabled={creating || deletingId !== null}
                aria-label="Next month"
                className="rounded-full p-1.5 text-slate-500 hover:bg-[#eef4fa] hover:text-[#1b64da] disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 px-4 pt-4 sm:grid-cols-2 sm:px-5">
            {([
              { label: "Day to work", value: workDate, hint: "Choose a holiday or weekly off", clear: () => setWorkDate("") },
              { label: "Day to take off", value: compOffDate, hint: "Choose a working day", clear: () => setCompOffDate("") },
            ]).map(({ label, value, hint, clear }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className={`mt-1 text-sm font-semibold ${value ? "text-slate-900" : "text-slate-500"}`}>
                    {value ? dateLabel(value) : hint}
                  </p>
                </div>
                {value && (
                  <button type="button" onClick={() => { clear(); setFormClosed(false); setFormError(""); }}
                    aria-label={`Remove ${label.toLowerCase()}`}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <p aria-live="polite" className="px-4 pt-3 text-xs text-slate-600 sm:px-5">
            {!workDate && !compOffDate
              ? "Select both dates to continue."
              : !workDate
                ? "Now select a holiday or weekly off to work."
                : !compOffDate
                  ? "Now select a working day to take off."
                  : formClosed
                    ? "Dates selected. Open the swap details when you are ready."
                    : "Dates selected. Continue with the swap details."}
          </p>
          {workDate && compOffDate && formClosed && (
            <button type="button" onClick={() => setFormClosed(false)}
              className="mx-4 mt-3 rounded-xl bg-[#1b64da] px-4 py-2 text-sm font-bold text-white hover:bg-[#1552b5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:mx-5">
              Open swap details
            </button>
          )}

          <div className="overflow-x-auto px-3 pb-5 pt-4 sm:px-5 md:px-6">
          <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-2 pb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="rounded-full bg-[#eef4fa] py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} aria-hidden="true" />;
              const date = toDateString(
                new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  day,
                ),
              );
              const holidayName = holidayNames.get(date);
              const weeklyOff = weeklyOffDays.includes(
                new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  day,
                ).getDay(),
              );
              const isOffDay = Boolean(holidayName || weeklyOff);
              const isSelectedWorkDate = isOffDay && workDate === date;
              const isSelectedCompOff = !isOffDay && compOffDate === date;
              const dayType = holidayName
                ? `holiday, ${holidayName}${weeklyOff ? ", also a weekly off" : ""}`
                : weeklyOff
                  ? "weekly off"
                  : "working day";
              const swapCount = visibleSwaps.filter(
                (swap) => swap.replacement_date === date || swap.holiday_date === date,
              ).length;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    if (isOffDay) {
                      setWorkDate(isSelectedWorkDate ? "" : date);
                    } else {
                      setCompOffDate(isSelectedCompOff ? "" : date);
                    }
                    setFormClosed(false);
                    setFormError("");
                  }}
                  title={`${dayType}: ${isSelectedWorkDate || isSelectedCompOff ? "remove selection" : `select as ${isOffDay ? "date worked" : "compensatory day off"}`}`}
                  aria-pressed={isSelectedWorkDate || isSelectedCompOff}
                  aria-label={`${date}, ${dayType}, ${isSelectedWorkDate || isSelectedCompOff ? "remove selection" : `select as ${isOffDay ? "date worked" : "compensatory day off"}`}`}
                  className={`requests-calendar-cell relative flex min-h-[132px] min-w-0 flex-col rounded-2xl border p-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    holidayName || swapCount > 0
                      ? "border-[#cfe3f5] bg-[#f3f9fe]"
                      : weeklyOff
                        ? "border-transparent bg-[#f5faff]"
                        : "border-[#eef2f7] bg-white"
                  } ${isSelectedWorkDate ? "ring-2 ring-[#1b64da] ring-offset-1" : isSelectedCompOff ? "ring-2 ring-emerald-600 ring-offset-1" : ""}`}
                  style={{ animationDelay: `${index * 18}ms` }}
                >
                  <span className="flex w-full shrink-0 items-center justify-between">
                    <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-black ${
                      isSelectedWorkDate ? "bg-[#1b64da] text-white" : isSelectedCompOff ? "bg-emerald-700 text-white" : "text-slate-800"
                    }`}>
                      {String(day).padStart(2, "0")}
                    </span>
                    {swapCount > 0 && (
                      <span title={`${swapCount} saved swap${swapCount === 1 ? "" : "s"}`} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#7BBDE8] px-1.5 text-xs font-extrabold text-slate-900">
                        {swapCount}
                      </span>
                    )}
                  </span>
                  <span className={`mt-2 block w-full truncate rounded-lg border px-2 py-1 text-left text-xs font-semibold ${
                    isSelectedWorkDate
                      ? "border-blue-200 bg-[#dbe7ff] text-blue-800"
                      : isSelectedCompOff
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : holidayName
                          ? "border-sky-200 bg-[#d3ebfa] text-sky-800"
                          : weeklyOff
                            ? "border-amber-200 bg-amber-100 text-amber-800"
                            : "border-blue-200 bg-[#dbe7ff] text-blue-800"
                  }`}>
                    {isSelectedWorkDate
                      ? "Work"
                      : isSelectedCompOff
                        ? "Off"
                        : holidayName
                          ? "Holiday"
                          : weeklyOff
                            ? "Weekly off"
                            : "Working"}
                  </span>
                  {holidayName && (
                    <span className="mt-1.5 w-full truncate text-xs font-medium text-slate-600">
                      {holidayName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#e8eef5] px-4 pt-4 text-xs font-semibold text-slate-700 sm:px-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Holiday
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Weekly off
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Working day
            </span>
          </div>
          <p className="px-4 pt-3 text-xs text-slate-600 sm:px-5">
            Holiday information is shown for {year}. Use the month arrows or
            year selector above to plan another year.
          </p>
          <div className="h-5" />
        </div>

        {formVisible && (
        <div className="grid min-w-0 content-start gap-5 rounded-2xl border border-blue-200 bg-[#f1f8fe] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-blue-900">2. Add swap details</h3>
              <p className="mt-1 text-sm text-slate-600">Choose employees and add a reason. You can still change either date.</p>
            </div>
            <button type="button" disabled={creating} aria-label="Close swap details"
              onClick={() => {
                calendarHeadingRef.current?.focus({ preventScroll: true });
                setFormClosed(true);
              }}
              className="shrink-0 rounded-xl p-2 text-slate-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <div>
            <label htmlFor="replacement-work-date" className="block text-base font-extrabold text-slate-900">
              Replacement work date
            </label>
            <p className="mb-2 mt-1 text-xs text-slate-600">
              Select an off day on the calendar, or enter a date in another year.
              Verify outside dates separately; their holidays are not shown here.
            </p>
            <input id="replacement-work-date" type="date" value={workDate}
              onChange={(event) => {
                setWorkDate(event.target.value);
                setFormError("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
          </div>
          <div>
            <h3 className="mb-1 text-base font-extrabold text-slate-900">
              Select employees
            </h3>
            <label className="relative mt-3 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search employees"
                value={employeeSearch}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setEmployeePage(1);
                }}
                placeholder="Search name or employee ID"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2">
              {loading && employees.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-slate-500">
                  Loading employees...
                </p>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const checked = selectedEmployees.some((item) => item.id === employee.id);
                  return (
                    <label
                      key={employee.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        checked ? "bg-blue-100 ring-1 ring-blue-300" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(employee)}
                        className="h-4 w-4 accent-[#1b64da]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-slate-800">
                          {employee.name}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {employee.emp_code} · {employee.designation || "Employee"}
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="px-2 py-4 text-center text-xs text-slate-500">
                  {employeeSearch
                    ? "No matching active employees."
                    : "No active employees found."}
                </p>
              )}
            </div>
            {pagination && pagination.total_pages > 1 && (
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <button type="button" disabled={loading || employeePage <= 1} onClick={() => setEmployeePage((page) => page - 1)} className="font-bold text-blue-700 disabled:opacity-40">Previous</button>
                <span>Page {employeePage} of {pagination.total_pages}</span>
                <button type="button" disabled={loading || employeePage >= pagination.total_pages} onClick={() => setEmployeePage((page) => page + 1)} className="font-bold text-blue-700 disabled:opacity-40">Next</button>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                Could not load employees: {error}
              </p>
            )}
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              <Users className="h-4 w-4" />
              {selectedEmployees.length} selected
            </p>
            {selectedEmployees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Selected employees">
                {selectedEmployees.map((employee) => (
                  <button key={employee.id} type="button" onClick={() => toggleEmployee(employee)}
                    aria-label={`Remove ${employee.name} (${employee.emp_code})`}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                    {employee.name} ({employee.emp_code}) <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="comp-off-date"
              className="block text-base font-extrabold text-slate-900"
            >
              Compensatory day off
            </label>
            <p className="mb-2 mt-1 text-xs text-slate-600">
              Select a working day on the calendar or enter the date here.
            </p>
            <input
              id="comp-off-date"
              type="date"
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              value={compOffDate}
              onChange={(event) => {
                setCompOffDate(event.target.value);
                setFormError("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <div>
            <label htmlFor="comp-reason" className="block text-base font-extrabold text-slate-900">
              Reason for the change
            </label>
            <textarea
              id="comp-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setFormError("");
              }}
              maxLength={500}
              rows={3}
              placeholder="For example, shutdown or project coverage"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <p className="mt-1 text-xs text-slate-500">{reason.length}/500 characters</p>
          </div>
          </div>

          <div className="rounded-xl border-2 border-blue-200 bg-white p-4 text-sm text-slate-700">
            <strong className="block text-base text-blue-900">Review your selection</strong>
            <p className="mt-1">
              Works: {workDate ? dateLabel(workDate) : "Not selected"} → Comp off:{" "}
              {compOffDate ? dateLabel(compOffDate) : "Not selected"}
            </p>
            <p className="mt-1">{selectedEmployees.length} employee(s): {selectedEmployees.map((employee) => employee.name).join(", ") || "None selected"}</p>
            <p className="mt-1">Reason: {reason.trim() || "Not provided"}</p>
          </div>

          {formError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleCreateSwap()}
            disabled={creating || deletingId !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b64da] px-4 py-4 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-colors hover:bg-[#1552b5] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create workday swap"}
          </button>
        </div>
        )}

        <div className="border-t border-[#e6edf4] pt-5 xl:col-span-full">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold text-slate-900">
              Saved workday swaps
            </h3>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {visibleSwaps.length}
            </span>
          </div>
          {visibleSwaps.length > 0 && (
            <input
              type="search"
              value={swapSearch}
              onChange={(event) => setSwapSearch(event.target.value)}
              placeholder="Search swaps by employee or reason"
              aria-label="Search saved workday swaps"
              className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
          )}
          {swapsLoading ? (
            <p className="py-4 text-xs text-slate-500">Loading workday swaps...</p>
          ) : swapsError ? (
            <div role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <p>{swapsError}</p>
              <button type="button" onClick={() => void dispatch(fetchWorkdaySwaps(year))} className="mt-2 font-bold underline">Retry</button>
            </div>
          ) : visibleSwaps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
              <Clock3 className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-600">
                No workday swaps for {year}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Saved arrangements will appear here.
              </p>
            </div>
          ) : filteredSwaps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">
              No swaps match your search.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredSwaps.map((swap) => (
                <div
                  key={swap.id}
                  className="rounded-2xl border border-blue-200 bg-[#f8fbff] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-slate-900">
                        {swap.employees.map((employee) => `${employee.name} (${employee.emp_code})`).join(", ")}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold text-sky-800">
                          Works: {dateLabel(swap.replacement_date)}
                        </span>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <span className="font-semibold text-blue-800">
                          Comp off: {dateLabel(swap.holiday_date)}
                        </span>
                      </p>
                      <p className="mt-2 break-words text-xs text-slate-600">
                        Reason: {swap.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setSelectedSwap(swap);
                      }}
                      disabled={creating || deletingId !== null}
                      aria-label={`Delete workday swap ${swap.id}`}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600 disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {selectedSwap && (
        <DeleteSwapModal
          swap={selectedSwap}
          deleting={deletingId !== null}
          error={deleteError}
          onCancel={() => {
            if (!deleteInFlight.current) {
              setSelectedSwap(null);
              setDeleteError("");
            }
          }}
          onConfirm={() => void handleDeleteSwap()}
        />
      )}
    </section>
  );
}
