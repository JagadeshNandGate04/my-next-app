"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Calendar,
  CalendarDays,
  ShieldCheck,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Lock,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  Hourglass,
  Loader2,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store/store";

import {
  fetchSettings,
  updateSettings,
  fetchHolidays,
  createHoliday,
  deleteHoliday,
  clearSettingsError,
  clearSettingsMessage,
  setSelectedYear,
} from "@/app/store/settings/settingsSlice";

// ============================================================
// THEME (same colours as the dashboard)
//   SKY       #7BBDE8
//   SKY LIGHT #bfe0f5
//   BLUE      #1b64da
//   INK       #0f172a
// ============================================================

const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

// ============================================================
// TYPES
// ============================================================

interface ShiftConfig {
  start: string;
  end: string;
}

interface SystemSettings {
  shift: ShiftConfig;
  full_day_hours: number;
  half_day_hours: number;
  weekly_off_days: number[];
  grace_min: number;
  break_allowance_min: number;
  duplicate_punch_window_min: number;
  payroll_divisor: "CALENDAR_DAYS";
  permission_monthly_min: number;
  permission_unit_min: number;
  leave_monthly_accrual: number;
  leave_balance_cap: number;
}

interface HolidayItem {
  id: number;
  holiday_date: string;
  name: string;
  year: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const INITIAL_SETTINGS: SystemSettings = {
  shift: {
    start: "09:30 AM",
    end: "06:30 PM",
  },
  full_day_hours: 8,
  half_day_hours: 4.5,
  weekly_off_days: [0, 6],
  grace_min: 15,
  break_allowance_min: 60,
  duplicate_punch_window_min: 2,
  payroll_divisor: "CALENDAR_DAYS",
  permission_monthly_min: 120,
  permission_unit_min: 30,
  leave_monthly_accrual: 1.75,
  leave_balance_cap: 24,
};

// ============================================================
// DAYS
// ============================================================

const DAYS_OF_WEEK = [
  { index: 0, label: "Sun (0)" },
  { index: 1, label: "Mon (1)" },
  { index: 2, label: "Tue (2)" },
  { index: 3, label: "Wed (3)" },
  { index: 4, label: "Thu (4)" },
  { index: 5, label: "Fri (5)" },
  { index: 6, label: "Sat (6)" },
];

// ============================================================
// FILLED COUNT CARD (same look as dashboard cards)
// ============================================================

interface CountCardProps {
  label: string;
  value: React.ReactNode;
  note: string;
  color: string;
  text: string;
  muted: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function CountCard({
  label,
  value,
  note,
  color,
  text,
  muted,
  Icon,
}: CountCardProps) {
  return (
    <div
      className="relative flex min-h-[170px] flex-col justify-end rounded-[32px] p-5 shadow-sm"
      style={{ backgroundColor: color, color: text }}
    >
      <p className="absolute left-5 top-5 max-w-[65%] text-[12px] font-bold font-mono uppercase leading-tight tracking-wide">
        {label}
      </p>

      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/60">
        <Icon className="h-4 w-4" />
      </span>

      <p className="text-xl sm:text-2xl font-black leading-tight tracking-tight">
        {value}
      </p>

      <p className={`mt-2 text-[11px] font-semibold leading-snug ${muted}`}>
        {note}
      </p>
    </div>
  );
}

// ============================================================
// REUSABLE INPUT CARD
// ============================================================

interface NumberFieldProps {
  label: string;
  settingKey: string;
  value: number;
  unit: string;
  step?: number;
  description?: string;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  settingKey,
  value,
  unit,
  step = 1,
  description,
  onChange,
}: NumberFieldProps) {
  return (
    <div className="bg-[#f0f6fa] border border-[#bfe0f5] rounded-3xl p-4">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-bold gap-2">
        <span>{label}</span>
        <span className="font-mono text-[11px]">{settingKey}</span>
      </div>

      <div className="flex items-center justify-between bg-white border border-[#bfe0f5] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#7BBDE8]/40">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="font-bold text-sm text-[#0f172a] bg-transparent focus:outline-none w-full min-w-0"
        />

        <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2">
          {unit}
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-slate-500 mt-2">{description}</p>
      )}
    </div>
  );
}

// ============================================================
// MAIN SETTINGS PAGE
// ============================================================

export default function SystemSettingsHub() {
  const dispatch = useDispatch<AppDispatch>();

  // ----------------------------------------------------------
  // REDUX STATE
  // ----------------------------------------------------------

  const {
    settings: savedSettings,
    holidays,
    selectedYear,
    settingsLoading,
    settingsUpdating,
    holidaysLoading,
    holidayCreating,
    holidayDeleting,
    error,
    updateError,
    holidayError,
    successMessage,
    updatedCount,
    affectedUsers,
  } = useSelector((state: RootState) => state.settings);

  // ----------------------------------------------------------
  // LOCAL FORM STATE
  // ----------------------------------------------------------

  const [settings, setSettings] =
    useState<SystemSettings>(INITIAL_SETTINGS);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  const [newHolidayDate, setNewHolidayDate] = useState("");

  const [newHolidayName, setNewHolidayName] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);

  const [isSavedToast, setIsSavedToast] = useState(false);

  // ----------------------------------------------------------
  // INITIAL API CALLS
  // ----------------------------------------------------------

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setNewHolidayDate(`${currentYear}-01-01`);
    dispatch(fetchSettings());
    dispatch(fetchHolidays(currentYear));
  }, [dispatch]);

  // ----------------------------------------------------------
  // SYNC REDUX SETTINGS WITH LOCAL FORM
  // ----------------------------------------------------------

  useEffect(() => {
    if (Object.keys(savedSettings).length > 0) {
      setSettings({
        ...INITIAL_SETTINGS,
        ...savedSettings,
        shift: {
          ...INITIAL_SETTINGS.shift,
          ...(savedSettings.shift as Partial<ShiftConfig> | undefined),
        },
      });
    }
  }, [savedSettings]);

  // ----------------------------------------------------------
  // SUCCESS TOAST
  // ----------------------------------------------------------

  useEffect(() => {
    if (successMessage) {
      setIsSavedToast(true);

      const timeout = window.setTimeout(() => {
        setIsSavedToast(false);
        dispatch(clearSettingsMessage());
      }, 3500);

      return () => window.clearTimeout(timeout);
    }
  }, [successMessage, dispatch]);

  // ----------------------------------------------------------
  // CLEAR ERRORS WHEN COMPONENT UNMOUNTS
  // ----------------------------------------------------------

  useEffect(() => {
    return () => {
      dispatch(clearSettingsError());
    };
  }, [dispatch]);

  // ----------------------------------------------------------
  // UPDATE NUMBER SETTING
  // ----------------------------------------------------------

  const updateNumberSetting = (
    key: keyof SystemSettings,
    value: number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ----------------------------------------------------------
  // UPDATE SHIFT
  // ----------------------------------------------------------

  const updateShift = (key: keyof ShiftConfig, value: string) => {
    setSettings((prev) => ({
      ...prev,
      shift: {
        ...prev.shift,
        [key]: value,
      },
    }));
  };

  // ----------------------------------------------------------
  // TOGGLE WEEKLY OFF DAYS
  // ----------------------------------------------------------

  const toggleWeeklyOff = (dayIdx: number) => {
    setSettings((prev) => {
      const exists = prev.weekly_off_days.includes(dayIdx);

      const updated = exists
        ? prev.weekly_off_days.filter((day) => day !== dayIdx)
        : [...prev.weekly_off_days, dayIdx].sort((a, b) => a - b);

      return {
        ...prev,
        weekly_off_days: updated,
      };
    });
  };

  // ----------------------------------------------------------
  // SAVE SETTINGS
  // PUT /update/settings
  // ----------------------------------------------------------

  const handleSaveSettings = async () => {
    setLocalError(null);
    dispatch(clearSettingsError());

    try {
      const result = await dispatch(
        updateSettings({
          settings: { ...settings },
        }),
      );

      console.log("Settings updated:", result);
    } catch (err) {
      setLocalError(
        typeof err === "string" ? err : "Failed to update settings",
      );
    }
  };

  // ----------------------------------------------------------
  // RESET SETTINGS TO DEFAULTS
  // ----------------------------------------------------------

  const handleResetDefaults = () => {
    const confirmed = window.confirm(
      "Reset all operational policy thresholds to default values? Remember to save your changes afterward.",
    );

    if (!confirmed) return;

    setSettings(INITIAL_SETTINGS);
    setLocalError(null);
  };

  // ----------------------------------------------------------
  // CHANGE YEAR AND FETCH HOLIDAYS
  // ----------------------------------------------------------

  const handleYearChange = (year: number) => {
    dispatch(setSelectedYear(year));
    dispatch(fetchHolidays(year));
  };

  // ----------------------------------------------------------
  // CREATE HOLIDAY
  // ----------------------------------------------------------

  const handleCreateHoliday = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!newHolidayName.trim()) {
      setLocalError("Please enter a holiday name");
      return;
    }

    if (!newHolidayDate) {
      setLocalError("Please select a holiday date");
      return;
    }

    setLocalError(null);
    dispatch(clearSettingsError());

    try {
      const result = await dispatch(
        createHoliday({
          holiday_date: newHolidayDate,
          name: newHolidayName.trim(),
        }),
      );

      console.log("Holiday created:", result);

      setNewHolidayName("");
      setNewHolidayDate(`${selectedYear}-01-01`);
      setIsHolidayModalOpen(false);
    } catch (err) {
      setLocalError(
        typeof err === "string" ? err : "Failed to create holiday",
      );
    }
  };

  // ----------------------------------------------------------
  // DELETE HOLIDAY
  // ----------------------------------------------------------

  const handleDeleteHoliday = async (
    id: number,
    name: string,
  ) => {
    const confirmed = window.confirm(
      `Delete holiday "${name}"? Day summaries for active employees on this date will automatically be recomputed.`,
    );

    if (!confirmed) return;

    setLocalError(null);
    dispatch(clearSettingsError());

    try {
      const result = await dispatch(deleteHoliday(id));

      console.log("Holiday deleted:", result);
    } catch (err) {
      setLocalError(
        typeof err === "string" ? err : "Failed to delete holiday",
      );
    }
  };

  // ----------------------------------------------------------
  // FORMAT HOLIDAY DATE
  // ----------------------------------------------------------

  const formatHolidayDate = (dateStr: string) => {
    const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);

    const day = String(d.getDate()).padStart(2, "0");

    const month = d
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();

    const weekday = d.toLocaleDateString("en-US", {
      weekday: "long",
    });

    return { day, month, weekday };
  };

  // ----------------------------------------------------------
  // ERROR MESSAGE
  // ----------------------------------------------------------

  const displayError = localError || updateError || holidayError || error;

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  if (settingsLoading && Object.keys(savedSettings).length === 0) {
    return (
      <div className="min-h-screen bg-[#f0f6fa]">
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#1b64da] animate-spin" />
            <p className="text-sm font-bold text-slate-500">
              Loading system settings...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-[#0f172a] font-sans antialiased selection:bg-[#7BBDE8]/30">
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-6">

          {/* ==================================================
              TOP BAR
          ================================================== */}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7BBDE8] animate-pulse" />

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
                  System Settings & Policy Controls
                </h1>
              </div>

              <p className="text-sm font-medium text-slate-500 mt-1.5 max-w-3xl">
                Configure global enterprise shift hours, attendance
                tolerance windows, leave accruals, and managed annual
                holiday schedules across NANDGATE-IT operations.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={settingsUpdating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#bfe0f5] text-xs font-bold text-[#0f172a] hover:bg-[#bfe0f5]/40 shadow-sm transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#1b64da]" />
                Reset to Defaults
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsUpdating}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-md shadow-[#1b64da]/20 transition-all disabled:opacity-60"
              >
                {settingsUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                <span>
                  {settingsUpdating ? "Saving..." : "Save All Settings"}
                </span>
              </button>
            </div>
          </div>

          {/* ==================================================
              ERROR MESSAGE
          ================================================== */}

          {displayError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#1b64da] border border-[#1b64da] text-white">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

              <div className="flex-1">
                <p className="text-sm font-bold">Operation Failed</p>
                <p className="text-xs mt-1 text-white/80">{displayError}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  dispatch(clearSettingsError());
                }}
                className="p-1 hover:bg-white/20 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ==================================================
              SUCCESS MESSAGE
          ================================================== */}

          {successMessage && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#bfe0f5] border border-[#7BBDE8] text-[#0f172a]">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#1b64da]" />

              <div>
                <p className="text-sm font-bold">{successMessage}</p>

                {updatedCount > 0 && (
                  <p className="text-xs mt-1">
                    {updatedCount} setting(s) updated successfully.
                  </p>
                )}

                {affectedUsers > 0 && (
                  <p className="text-xs mt-1">
                    {affectedUsers} active employee(s) affected.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              KPI CARDS (filled like the dashboard)
          ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <CountCard
              label="SHIFT.START & SHIFT.END"
              value={`${settings.shift.start} – ${settings.shift.end}`}
              note={`${settings.full_day_hours} hrs standard`}
              color={SKY}
              text={INK}
              muted="text-black/50"
              Icon={Clock}
            />

            <CountCard
              label="WEEKLY_OFF_DAYS"
              value={`${settings.weekly_off_days.length} Days Off / Wk`}
              note={`[${settings.weekly_off_days.join(", ")}]`}
              color={SKY_LIGHT}
              text={INK}
              muted="text-black/50"
              Icon={CalendarDays}
            />

            <CountCard
              label="ANNUAL HOLIDAYS"
              value={`${holidays.length} Declared`}
              note={`Calendar year ${selectedYear}`}
              color={BLUE}
              text="#ffffff"
              muted="text-white/70"
              Icon={Calendar}
            />

            <CountCard
              label="LEAVE_BALANCE_CAP"
              value={`${settings.leave_monthly_accrual} Days / mo`}
              note={`Cap: ${settings.leave_balance_cap} days`}
              color={SKY}
              text={INK}
              muted="text-black/50"
              Icon={Hourglass}
            />
          </div>

          {/* ==================================================
              MAIN WORKSPACE
          ================================================== */}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* =================================================
                LEFT: OPERATIONAL SETTINGS
            ================================================= */}

            <div className="lg:col-span-7 space-y-6">

              <div className="flex items-center gap-2 px-2">
                <span className="w-2 h-2 rounded-full bg-[#7BBDE8]" />

                <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
                  Core Operational Policies
                </h2>
              </div>

              {/* ==============================================
                  SECTION A: SHIFT SETTINGS
              ============================================== */}

              <div className="bg-white border border-[#e6edf4] rounded-[32px] p-6 shadow-sm space-y-5">

                <div className="flex items-center gap-3 border-b border-[#e6edf4] pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#7BBDE8] flex items-center justify-center text-[#0f172a] font-black text-xs">
                    A
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#0f172a]">
                      Shift Timing & Core Work Windows
                    </h3>

                    <p className="text-xs text-slate-500">
                      Default shifts and attendance thresholds
                    </p>
                  </div>
                </div>

                {/* SHIFT START AND END */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="bg-[#f0f6fa] border border-[#bfe0f5] rounded-3xl p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-bold">
                      <span>Shift Start Time</span>
                      <span className="font-mono text-[11px]">shift.start</span>
                    </div>

                    <div className="flex items-center justify-between bg-white border border-[#bfe0f5] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#7BBDE8]/40">
                      <input
                        type="text"
                        value={settings.shift.start}
                        onChange={(e) =>
                          updateShift("start", e.target.value)
                        }
                        placeholder="09:30 AM"
                        className="font-bold text-sm text-[#0f172a] bg-transparent focus:outline-none w-full"
                      />

                      <Clock className="w-4 h-4 text-[#7BBDE8] shrink-0 ml-2" />
                    </div>
                  </div>

                  <div className="bg-[#f0f6fa] border border-[#bfe0f5] rounded-3xl p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-bold">
                      <span>Shift End Time</span>
                      <span className="font-mono text-[11px]">shift.end</span>
                    </div>

                    <div className="flex items-center justify-between bg-white border border-[#bfe0f5] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#7BBDE8]/40">
                      <input
                        type="text"
                        value={settings.shift.end}
                        onChange={(e) =>
                          updateShift("end", e.target.value)
                        }
                        placeholder="06:30 PM"
                        className="font-bold text-sm text-[#0f172a] bg-transparent focus:outline-none w-full"
                      />

                      <Clock className="w-4 h-4 text-[#7BBDE8] shrink-0 ml-2" />
                    </div>
                  </div>
                </div>

                {/* FULL DAY AND HALF DAY */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <NumberField
                    label="Full Day Requirement"
                    settingKey="full_day_hours"
                    value={settings.full_day_hours}
                    unit="hrs"
                    step={0.5}
                    onChange={(value) =>
                      updateNumberSetting("full_day_hours", value)
                    }
                  />

                  <NumberField
                    label="Half Day Requirement"
                    settingKey="half_day_hours"
                    value={settings.half_day_hours}
                    unit="hrs"
                    step={0.5}
                    onChange={(value) =>
                      updateNumberSetting("half_day_hours", value)
                    }
                  />
                </div>

                {/* WEEKLY OFF DAYS */}

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-bold gap-2">
                    <span>Standard Weekly Off Days</span>

                    <span className="font-mono text-[11px]">
                      [{settings.weekly_off_days.join(", ")}]
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected =
                        settings.weekly_off_days.includes(day.index);

                      return (
                        <button
                          key={day.index}
                          type="button"
                          onClick={() => toggleWeeklyOff(day.index)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-[#1b64da] text-white shadow-sm"
                              : "bg-[#f0f6fa] text-[#0f172a] hover:bg-[#bfe0f5]"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    Selected days are treated as weekly off days by
                    attendance computation.
                  </p>
                </div>
              </div>

              {/* ==============================================
                  SECTION B: ATTENDANCE SETTINGS
              ============================================== */}

              <div className="bg-white border border-[#e6edf4] rounded-[32px] p-6 shadow-sm space-y-5">

                <div className="flex items-center gap-3 border-b border-[#e6edf4] pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#7BBDE8] flex items-center justify-center text-[#0f172a] font-black text-xs">
                    B
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#0f172a]">
                      Attendance Tolerance & Punch Integrity
                    </h3>

                    <p className="text-xs text-slate-500">
                      Lateness, break allowance, and duplicate punch rules
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <NumberField
                    label="Arrival Grace Window"
                    settingKey="grace_min"
                    value={settings.grace_min}
                    unit="mins"
                    description="Allowed grace period before a late flag."
                    onChange={(value) =>
                      updateNumberSetting("grace_min", value)
                    }
                  />

                  <NumberField
                    label="Lunch & Break Allowance"
                    settingKey="break_allowance_min"
                    value={settings.break_allowance_min}
                    unit="mins"
                    description="Standard break allowance in minutes."
                    onChange={(value) =>
                      updateNumberSetting("break_allowance_min", value)
                    }
                  />

                  <NumberField
                    label="Duplicate Punch Filter"
                    settingKey="duplicate_punch_window_min"
                    value={settings.duplicate_punch_window_min}
                    unit="mins"
                    description="Ignores duplicate punches within this window."
                    onChange={(value) =>
                      updateNumberSetting(
                        "duplicate_punch_window_min",
                        value,
                      )
                    }
                  />

                  {/* PAYROLL DIVISOR */}

                  <div className="bg-[#f0f6fa] border border-[#bfe0f5] rounded-3xl p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-bold">
                      <span>Payroll Divisor Engine</span>

                      <Lock className="w-3.5 h-3.5 text-[#7BBDE8]" />
                    </div>

                    <div className="flex items-center justify-between bg-white border border-[#bfe0f5] rounded-xl px-3 py-2">
                      <span className="font-mono font-bold text-xs text-[#1b64da]">
                        CALENDAR_DAYS
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#bfe0f5] text-[#0f172a]">
                        IMMUTABLE
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2">
                      Salary divisor uses calendar days.
                    </p>
                  </div>
                </div>
              </div>

              {/* ==============================================
                  SECTION C: LEAVE SETTINGS
              ============================================== */}

              <div className="bg-white border border-[#e6edf4] rounded-[32px] p-6 shadow-sm space-y-5">

                <div className="flex items-center gap-3 border-b border-[#e6edf4] pb-3">
                  <div className="w-8 h-8 rounded-full bg-[#7BBDE8] flex items-center justify-center text-[#0f172a] font-black text-xs">
                    C
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#0f172a]">
                      Leave Accrual & Permission Allocations
                    </h3>

                    <p className="text-xs text-slate-500">
                      Monthly leave credits, balance caps, and permission limits
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <NumberField
                    label="Monthly Permission Pool"
                    settingKey="permission_monthly_min"
                    value={settings.permission_monthly_min}
                    unit={`min (${(settings.permission_monthly_min / 60).toFixed(1)} hrs)`}
                    description="Maximum total permission minutes per month."
                    onChange={(value) =>
                      updateNumberSetting(
                        "permission_monthly_min",
                        value,
                      )
                    }
                  />

                  {/* PERMISSION UNIT */}

                  <div className="bg-[#f0f6fa] border border-[#bfe0f5] rounded-3xl p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-bold">
                      <span>Permission Unit Block</span>

                      <span className="font-mono text-[11px]">
                        permission_unit_min
                      </span>
                    </div>

                    <select
                      value={settings.permission_unit_min}
                      onChange={(e) =>
                        updateNumberSetting(
                          "permission_unit_min",
                          Number(e.target.value),
                        )
                      }
                      className="w-full bg-white border border-[#bfe0f5] rounded-xl px-3 py-2 font-bold text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>60 Minutes</option>
                    </select>

                    <p className="text-[11px] text-slate-500 mt-2">
                      Permission deduction unit.
                    </p>
                  </div>

                  <NumberField
                    label="Monthly Earned Accrual"
                    settingKey="leave_monthly_accrual"
                    value={settings.leave_monthly_accrual}
                    unit="days"
                    step={0.25}
                    description="Monthly earned leave credit."
                    onChange={(value) =>
                      updateNumberSetting(
                        "leave_monthly_accrual",
                        value,
                      )
                    }
                  />

                  <NumberField
                    label="Maximum Leave Balance"
                    settingKey="leave_balance_cap"
                    value={settings.leave_balance_cap}
                    unit="days"
                    description="Maximum permitted leave balance."
                    onChange={(value) =>
                      updateNumberSetting("leave_balance_cap", value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                RIGHT: HOLIDAY MANAGEMENT
            ================================================= */}

            <div className="lg:col-span-5 space-y-6">

              <div className="flex items-center justify-between px-2 gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1b64da]" />

                  <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
                    Annual Holidays
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    setNewHolidayDate(`${selectedYear}-01-01`);
                    setIsHolidayModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Holiday
                </button>
              </div>

              {/* HOLIDAY CARD */}

              <div className="bg-white border border-[#e6edf4] rounded-[32px] p-6 shadow-sm space-y-4">

                <div className="flex items-center justify-between border-b border-[#e6edf4] pb-3 gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Declared Schedule{" "}
                    <strong className="text-[#1b64da]">
                      CY {selectedYear}
                    </strong>
                  </span>
                </div>

                {/* YEAR SELECTOR */}

                <div className="flex items-center gap-2">
                  {[2025, 2026, 2027].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearChange(year)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        selectedYear === year
                          ? "bg-[#1b64da] text-white"
                          : "bg-[#f0f6fa] text-[#0f172a] hover:bg-[#bfe0f5]"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>

                {/* HOLIDAY LOADING */}

                {holidaysLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1b64da]" />
                    Fetching holidays...
                  </div>
                )}

                {/* HOLIDAY LIST */}

                {!holidaysLoading && holidays.length > 0 && (
                  <div className="space-y-3">
                    {holidays.map((h: HolidayItem) => {
                      const { day, month, weekday } =
                        formatHolidayDate(h.holiday_date);

                      return (
                        <div
                          key={h.id}
                          className="group flex items-center justify-between gap-3 p-3.5 rounded-3xl bg-[#f0f6fa] border border-[#e6edf4] hover:border-[#7BBDE8] hover:bg-white transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">

                            {/* DATE BADGE (filled) */}

                            <div className="w-12 h-12 rounded-2xl bg-[#7BBDE8] flex flex-col items-center justify-center text-[#0f172a] shrink-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                                {month}
                              </span>

                              <span className="text-base font-black leading-tight mt-0.5">
                                {day}
                              </span>
                            </div>

                            {/* HOLIDAY DETAILS */}

                            <div className="min-w-0">
                              <div className="font-bold text-sm text-[#0f172a] group-hover:text-[#1b64da] transition-colors break-words">
                                {h.name}
                              </div>

                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                <span>{weekday}</span>
                                <span>•</span>
                                <span>{h.holiday_date}</span>
                              </div>
                            </div>
                          </div>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteHoliday(h.id, h.name)
                            }
                            disabled={holidayDeleting}
                            className="p-2 rounded-full text-slate-400 hover:text-[#1b64da] hover:bg-[#bfe0f5]/60 transition-colors disabled:opacity-40 shrink-0"
                            title="Delete Holiday"
                          >
                            {holidayDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* EMPTY STATE */}

                {!holidaysLoading && holidays.length === 0 && (
                  <div className="text-center py-10">
                    <CalendarDays className="w-10 h-10 text-[#7BBDE8] mx-auto mb-3" />

                    <p className="font-bold text-sm text-slate-600">
                      No holidays found
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      No holidays have been declared for {selectedYear}.
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsHolidayModalOpen(true)}
                      className="mt-4 text-xs font-bold text-[#1b64da] hover:underline"
                    >
                      + Add your first holiday
                    </button>
                  </div>
                )}

                {/* INFORMATION */}

                <div className="mt-6 bg-[#bfe0f5]/50 border border-[#7BBDE8] rounded-3xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#1b64da] shrink-0 mt-0.5" />

                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-[#0f172a] block mb-1">
                      Holiday Management
                    </strong>

                    Adding a holiday automatically marks the date as
                    HOLIDAY for active employees. Deleting a holiday
                    recomputes the affected attendance summaries using
                    your backend attendance computation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================
          ADD HOLIDAY MODAL
      ====================================================== */}

      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-[#e6edf4] rounded-[32px] max-w-md w-full p-6 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between pb-4 border-b border-[#e6edf4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#bfe0f5] flex items-center justify-center text-[#1b64da]">
                  <Calendar className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="font-black text-lg text-[#0f172a]">
                    Add New Holiday
                  </h3>

                  <p className="text-xs text-slate-500">
                    Create a company holiday
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHolidayModalOpen(false)}
                disabled={holidayCreating}
                className="p-2 rounded-full text-slate-400 hover:text-[#1b64da] hover:bg-[#bfe0f5]/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL FORM */}

            <form onSubmit={handleCreateHoliday} className="mt-5 space-y-4">

              {/* DATE */}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Holiday Date
                </label>

                <input
                  type="date"
                  required
                  value={newHolidayDate}
                  onChange={(e) =>
                    setNewHolidayDate(e.target.value)
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                />
              </div>

              {/* NAME */}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Holiday Name
                </label>

                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="e.g. Tamil New Year"
                  value={newHolidayName}
                  onChange={(e) =>
                    setNewHolidayName(e.target.value)
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                />

                <p className="text-[11px] text-slate-400 mt-1">
                  Maximum 80 characters.
                </p>
              </div>

              {/* AUTOMATIC BROADCAST INFO */}

              <div className="p-3 bg-[#bfe0f5]/50 rounded-2xl border border-[#7BBDE8] text-xs text-slate-700 leading-relaxed">
                <strong>Automatic Attendance Update:</strong>{" "}
                The backend will mark the selected date as HOLIDAY
                for all active employees and create an audit log entry.
              </div>

              {/* MODAL ERROR */}

              {localError && (
                <div className="p-3 bg-[#1b64da] border border-[#1b64da] rounded-2xl text-xs text-white flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              {/* BUTTONS */}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#e6edf4]">
                <button
                  type="button"
                  disabled={holidayCreating}
                  onClick={() => {
                    setIsHolidayModalOpen(false);
                    setLocalError(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-[#bfe0f5]/50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={holidayCreating}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md shadow-[#1b64da]/20 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {holidayCreating && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {holidayCreating
                    ? "Creating..."
                    : "Confirm & Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          SAVE TOAST
      ====================================================== */}

      {isSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-[#7BBDE8] shrink-0" />

          <div className="text-xs">
            <p className="font-bold">{successMessage}</p>

            <p className="text-slate-400 text-[11px]">
              Backend operation completed successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}