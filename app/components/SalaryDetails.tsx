"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, History, Pencil, RefreshCw } from "lucide-react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store/store";
import { fetchEmployeeSalaryHistory, updateEmployeeSalary, type EmployeeSalary, type EmployeeSalaryHistory } from "@/app/store/employee/employeeSlice";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const salaryDateKey = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const formatDate = (value: string) => {
  const [year, month, day] = salaryDateKey(value).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function SalaryDetails({
  salary,
  loading,
  error,
  onRetry,
}: {
  salary: EmployeeSalary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm font-medium text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin text-[#1b64da]" />
        Loading salary details...
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-semibold text-rose-800">{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-bold text-rose-700 underline underline-offset-2 hover:text-rose-900">
          Try again
        </button>
      </div>
    );
  }
  if (!salary) return null;
  if (!salary.salary_structure) {
    return (
      <>
        <p className="py-8 text-center text-sm text-slate-500">No current salary structure is available for this employee.</p>
        <SalaryHistory employeeId={Number(salary.employee.id)} />
      </>
    );
  }

  const structure = salary.salary_structure;
  if (editing) {
    return (
      <SalaryEditForm
        salary={salary}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); setSaved(true); }}
        onReload={onRetry}
      />
    );
  }

  return (
    <>
      {saved && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Salary structure saved successfully.</p>}
      <div className="rounded-2xl bg-gradient-to-r from-[#1553b5] to-[#1b78d5] px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Gross salary</p>
          <button type="button" onClick={() => { setSaved(false); setEditing(true); }} aria-label="Edit salary" title="Edit salary" className="rounded-lg p-1.5 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-2xl font-black">{formatAmount(structure.gross)}</p>
        <p className="mt-1 text-xs text-blue-100">
          Effective from {formatDate(structure.effective_from)}
          {structure.effective_to && ` to ${formatDate(structure.effective_to)}`}
        </p>
      </div>
      <h3 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Salary breakdown</h3>
      <dl className="divide-y divide-slate-100">
        {([
          ["Basic salary", structure.basic],
          ["House rent allowance", structure.hra],
          ["Dearness allowance", structure.da],
          ["Special allowance", structure.special_allowance],
        ] as const).map(([label, amount]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-bold tabular-nums text-slate-900">{formatAmount(amount)}</dd>
          </div>
        ))}
      </dl>
      <SalaryHistory employeeId={Number(salary.employee.id)} />
    </>
  );
}

function SalaryHistory({ employeeId }: { employeeId: number }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  return (
    <section className="mt-5 border-t border-slate-200 pt-4" aria-label="Salary history">
      <button type="button" aria-expanded={open} onClick={() => {
        setOpen(!open);
        setVisited(true);
      }} className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-2 text-left text-sm font-bold text-blue-700 hover:text-blue-900">
        <span className="flex items-center gap-2"><History className="h-4 w-4" /> Salary history</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {visited && <div hidden={!open}><SalaryHistoryContent employeeId={employeeId} /></div>}
    </section>
  );
}

export function SalaryHistoryContent({ employeeId }: { employeeId: number }) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EmployeeSalaryHistory | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const pending = dispatch(fetchEmployeeSalaryHistory(employeeId));
    pending.unwrap().then((result) => {
      if (active) setHistory(result);
    }).catch((failure: unknown) => {
      if (active) {
        setError(failure instanceof Error ? failure.message :
          typeof failure === "object" && failure !== null && "message" in failure && typeof failure.message === "string"
            ? failure.message : "Unable to load salary history.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; pending.abort(); };
  }, [dispatch, employeeId, attempt]);

  return (
        <div className="mt-2 space-y-3">
          {loading && <p role="status" className="text-sm text-slate-600">Loading salary history...</p>}
          {error && (
            <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              <p>{error}</p>
              <button type="button" onClick={() => { setError(null); setLoading(true); setAttempt((value) => value + 1); }} className="mt-2 font-bold underline">Try again</button>
            </div>
          )}
          {history && (
            <>
              <p className="text-sm text-slate-600">
                {history.total_salary_revisions} {history.total_salary_revisions === 1 ? "revision" : "revisions"}
                {history.initial_gross !== null && history.latest_gross !== null &&
                  ` · ${formatAmount(history.initial_gross)} → ${formatAmount(history.latest_gross)}`}
              </p>
              {history.revisions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No salary history available.</p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {[...history.revisions].sort((a, b) => salaryDateKey(b.effective_from).localeCompare(salaryDateKey(a.effective_from))).map((revision) => (
                    <details key={revision.id} className="rounded-xl border border-slate-200 bg-white">
                      <summary className="cursor-pointer list-none p-3 focus-visible:outline-2 focus-visible:outline-blue-600">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{formatAmount(revision.gross)}</span>
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${revision.status === "CURRENT" ? "bg-emerald-100 text-emerald-800" : revision.status === "SCHEDULED" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                            {revision.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDate(revision.effective_from)} – {revision.effective_to ? formatDate(revision.effective_to) : "No end date"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-700">View breakdown</p>
                      </summary>
                      <dl className="space-y-1.5 border-t border-slate-100 px-3 py-3 text-sm">
                        {([
                          ["Basic", formatAmount(revision.basic)],
                          ["HRA", formatAmount(revision.hra)],
                          ["DA", formatAmount(revision.da)],
                          ["Special allowance", formatAmount(revision.special_allowance)],
                          ["Previous gross", revision.previous_gross === null ? "—" : formatAmount(revision.previous_gross)],
                          ["Change", revision.salary_difference === null ? "—" : `${revision.salary_difference > 0 ? "+" : ""}${formatAmount(revision.salary_difference)}`],
                          ["Change percentage", revision.salary_change_percentage === null ? "—" : `${revision.salary_change_percentage > 0 ? "+" : ""}${revision.salary_change_percentage}%`],
                          ["Change type", revision.change_type.replace(/_/g, " ")],
                          ["Duration", `${revision.duration_days} ${revision.duration_days === 1 ? "day" : "days"}`],
                        ] as const).map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-800">{value}</dd></div>
                        ))}
                      </dl>
                    </details>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
  );
}

type SalaryForm = {
  basic: string;
  hra: string;
  da: string;
  special_allowance: string;
  effective_from: string;
};

function SalaryEditForm({
  salary,
  onCancel,
  onSaved,
  onReload,
}: {
  salary: EmployeeSalary;
  onCancel: () => void;
  onSaved: () => void;
  onReload: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const structure = salary.salary_structure;
  const [initial] = useState<SalaryForm>(() => ({
    basic: String(structure?.basic ?? ""),
    hra: String(structure?.hra ?? ""),
    da: String(structure?.da ?? ""),
    special_allowance: String(structure?.special_allowance ?? ""),
    effective_from: salaryDateKey(structure?.effective_from ?? ""),
  }));
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadRequired, setReloadRequired] = useState(false);
  const savingRef = useRef(false);
  const fields = [
    ["basic", "Basic salary"],
    ["hra", "House rent allowance"],
    ["da", "Dearness allowance"],
    ["special_allowance", "Special allowance"],
  ] as const;
  const validAmounts = fields.every(([key]) =>
    /^\d+(?:\.\d{1,2})?$/.test(form[key]) && Number.isFinite(Number(form[key]))
  );
  const changed = fields.some(([key]) => Number(form[key]) !== Number(initial[key])) ||
    form.effective_from !== initial.effective_from;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current || reloadRequired || !validAmounts || !form.effective_from || !changed) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await dispatch(updateEmployeeSalary({
        id: Number(salary.employee.id),
        basic: Number(form.basic),
        hra: Number(form.hra),
        da: Number(form.da),
        special_allowance: Number(form.special_allowance),
        effective_from: form.effective_from,
      })).unwrap();
      onSaved();
    } catch (failure) {
      if (typeof failure === "object" && failure !== null && "message" in failure && typeof failure.message === "string") {
        setError(failure.message);
        setReloadRequired("reloadRequired" in failure && failure.reloadRequired === true);
      } else {
        setError("Unable to update salary.");
      }
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">Edit salary structure</h3>
        <p className="mt-1 text-sm text-slate-500">Enter the salary amounts and the date the changes take effect.</p>
      </div>
      {fields.map(([key, label]) => (
        <label key={key} className="block text-sm font-semibold text-slate-700">
          {label} (₹)
          <input type="number" min="0" step="0.01" required value={form[key]} disabled={saving || reloadRequired}
            onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50" />
        </label>
      ))}
      <label className="block text-sm font-semibold text-slate-700">
        Effective from
        <input type="date" required value={form.effective_from} disabled={saving || reloadRequired}
          onChange={(event) => setForm((previous) => ({ ...previous, effective_from: event.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50" />
      </label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {reloadRequired ? (
          <button type="button" onClick={onReload} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Reload salary</button>
        ) : (
          <>
            <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving || !validAmounts || !form.effective_from || !changed} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
