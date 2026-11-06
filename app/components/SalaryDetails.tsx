"use client";

import { RefreshCw } from "lucide-react";
import type { EmployeeSalary } from "@/app/store/employee/employeeSlice";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
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
    return <p className="py-8 text-center text-sm text-slate-500">No current salary structure is available for this employee.</p>;
  }

  const structure = salary.salary_structure;
  return (
    <>
      <div className="rounded-2xl bg-gradient-to-r from-[#1553b5] to-[#1b78d5] px-5 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Current gross salary</p>
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
    </>
  );
}
