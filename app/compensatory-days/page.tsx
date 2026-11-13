"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import type { AppDispatch, RootState } from "@/app/store/store";
import {
  fetchHolidays,
  fetchSettings,
  type Holiday,
} from "@/app/store/settings/settingsSlice";
import CompensatoryDayPlanner from "./CompensatoryDayPlanner";

interface PlannerData {
  holidays: Holiday[];
  weeklyOffDays: number[];
}

export default function CompensatoryDaysPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { creating, deletingId } = useSelector((state: RootState) => state.workdaySwaps);
  const [year, setYear] = useState<number | null>(null);
  const [initialMonth, setInitialMonth] = useState(0);
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      setYear(now.getFullYear());
      setInitialMonth(now.getMonth());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (year === null) return;
    let active = true;
    const load = async () => {
      const [settingsResponse, holidaysResponse] = await Promise.all([
        dispatch(fetchSettings()),
        dispatch(fetchHolidays(year)),
      ]);
      if (!active) return;
      const weeklyOffDays = settingsResponse?.data?.settings?.weekly_off_days;
      if (
        settingsResponse?.success !== true ||
        holidaysResponse?.success !== true ||
        holidaysResponse.data?.year !== year ||
        !Array.isArray(holidaysResponse.data?.holidays) ||
        !Array.isArray(weeklyOffDays) ||
        !weeklyOffDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      ) {
        setData(null);
        setError("Could not load the holiday calendar and weekly-off settings. Please try again.");
      } else {
        setData({ holidays: holidaysResponse.data.holidays, weeklyOffDays });
        setError("");
      }
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [dispatch, year, retry]);

  const changeYear = (nextYear: number, month = 0) => {
    if (nextYear === year) return;
    if (!window.confirm("Changing the year clears the current unsaved form. Continue?")) return;
    setData(null);
    setLoading(true);
    setError("");
    setInitialMonth(month);
    setYear(nextYear);
  };

  return (
    <main className="min-h-screen bg-[#f0f6fa] py-8 text-slate-800">
      <div className="mx-auto w-full max-w-[1700px] space-y-6 px-3 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1b64da]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Attendance planning
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Compensatory Days
            </h1>
            <p className="mt-2 text-base text-slate-700">
              Plan who works on an off day and which working day they take off instead.
            </p>
          </div>
          {year !== null && (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-white p-2 shadow-sm">
              <span className="pl-2 text-xs font-bold text-slate-700">Calendar year</span>
              <button type="button" disabled={loading || creating || deletingId !== null} onClick={() => changeYear(year - 1)} aria-label="Previous year" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">←</button>
              <span className="min-w-14 text-center text-lg font-black text-blue-900">{year}</span>
              <button type="button" disabled={loading || creating || deletingId !== null} onClick={() => changeYear(year + 1)} aria-label="Next year" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">→</button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Loading holidays and weekly-off settings...
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => {
              setLoading(true);
              setError("");
              setRetry((value) => value + 1);
            }} className="mt-3 inline-flex items-center gap-2 font-bold underline">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}
        {year !== null && data && !loading && (
          <CompensatoryDayPlanner
            key={year}
            year={year}
            initialMonth={initialMonth}
            holidays={data.holidays}
            weeklyOffDays={data.weeklyOffDays}
            onChangeYear={changeYear}
          />
        )}
      </div>
    </main>
  );
}
