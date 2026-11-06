"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { RefreshCw, X } from "lucide-react";
import type { AppDispatch } from "@/app/store/store";
import { adjustAttendanceLop } from "@/app/store/attendance/attendanceSlice";

export interface LopAdjustmentSelection {
  userId: string;
  employeeName: string;
  date: string;
  currentLop: number;
}

export default function LopAdjustmentModal({
  selection,
  onClose,
  onSaved,
}: {
  selection: LopAdjustmentSelection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const [newLop, setNewLop] = useState(String(selection.currentLop));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    const userId = Number(selection.userId);
    const value = Number(newLop);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      setError("This employee has an invalid ID. Unable to adjust LOP.");
      return;
    }
    if (!newLop.trim() || !Number.isFinite(value) || value < 0 || value > 2) {
      setError("Enter an LOP value between 0 and 2 days.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for the LOP adjustment.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await dispatch(adjustAttendanceLop({
        user_id: userId,
        work_date: selection.date,
        new_lop: value,
        reason: reason.trim(),
      }));
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to adjust attendance LOP.");
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lop-adjustment-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onClose();
          if (event.key !== "Tab") return;
          const elements = modalRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)");
          if (!elements?.length) return;
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[#f1f8fe] px-5 py-5">
          <div>
            <h2 id="lop-adjustment-title" className="text-lg font-black text-slate-900">Adjust LOP</h2>
            <p className="mt-1 text-sm text-slate-600">{selection.employeeName} · {selection.date}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Current LOP: {selection.currentLop} days</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={saving} aria-label="Close LOP adjustment" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 overflow-y-auto p-5">
          <div>
            <label htmlFor="new-lop" className="block text-sm font-bold text-slate-700">New LOP (days)</label>
            <input id="new-lop" type="number" min="0" max="2" step="any" required disabled={saving} value={newLop} onChange={(event) => setNewLop(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-2 focus:outline-blue-500" />
            <p className="mt-1 text-xs text-slate-500">Enter a value between 0 and 2; fractions are allowed.</p>
          </div>
          <div>
            <label htmlFor="lop-reason" className="block text-sm font-bold text-slate-700">Reason</label>
            <textarea id="lop-reason" required disabled={saving} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-2 focus:outline-blue-500" />
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#1b64da] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1552b5] disabled:opacity-50">
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Submit adjustment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
