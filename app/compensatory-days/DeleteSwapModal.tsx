"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { WorkdaySwap } from "@/app/store/settings/workdaySwapSlice";

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function DeleteSwapModal({
  swap,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  swap: WorkdaySwap;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const modalRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-swap-title"
        aria-describedby="delete-swap-description"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !deleting) onCancel();
          if (event.key !== "Tab") return;
          const buttons = modalRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
          if (!buttons?.length) {
            event.preventDefault();
            return;
          }
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 bg-rose-50 px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="delete-swap-title" className="text-lg font-black text-slate-900">
                Delete workday swap?
              </h2>
              <p id="delete-swap-description" className="mt-1 text-sm text-slate-600">
                This removes the swap for all listed employees.
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={deleting} aria-label="Close delete confirmation" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><strong>Work date:</strong> {formatDate(swap.replacement_date)}</p>
            <p><strong>Compensatory day off:</strong> {formatDate(swap.holiday_date)}</p>
            <p><strong>Employees:</strong> {swap.employees.map((employee) => `${employee.name} (${employee.emp_code})`).join(", ")}</p>
            <p className="break-words"><strong>Reason:</strong> {swap.reason}</p>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button ref={cancelRef} type="button" onClick={onCancel} disabled={deleting} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleting ? "Deleting..." : "Delete swap"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
