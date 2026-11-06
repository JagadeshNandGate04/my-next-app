"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, X } from "lucide-react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store/store";
import { decideAdminRequest, type DecisionAction } from "@/app/store/requests/requestSlice";
import { requestTypeLabel, type AttendanceRequest } from "@/app/store/attendance/attendanceRequests";

export default function AttendanceRequestModal({
  date,
  employeeName,
  requests,
  onClose,
  onDecided,
}: {
  date: string;
  employeeName: string;
  requests: AttendanceRequest[];
  onClose: () => void;
  onDecided: (request: AttendanceRequest, action: DecisionAction) => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const [selected, setSelected] = useState<AttendanceRequest | null>(null);
  const [action, setAction] = useState<DecisionAction>("APPROVE");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  const submit = async () => {
    if (!selected || selected.request.status !== "PENDING" || !note.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await dispatch(decideAdminRequest({
        id: selected.request.id,
        type: selected.type,
        action,
        note: note.trim(),
      }));
      onDecided(selected, action);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to process this request.");
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
        aria-labelledby="attendance-request-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onClose();
          if (event.key !== "Tab") return;
          const elements = modalRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), textarea:not(:disabled)");
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
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[#f1f8fe] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b64da] text-white">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <h2 id="attendance-request-title" className="text-lg font-black text-slate-900">Attendance requests</h2>
              <p className="mt-1 text-sm text-slate-600">{employeeName} · {date}</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={saving} aria-label="Close attendance requests" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5 sm:p-6">
          {requests.map((item) => {
            const isSelected = selected?.type === item.type && selected.request.id === item.request.id;
            return (
              <div key={`${item.type}-${item.request.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    {requestTypeLabel(item.type)} request <span className="text-sm font-medium text-slate-500">#{item.request.id}</span>
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.request.status === "PENDING" ? "bg-amber-100 text-amber-800" : item.request.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {item.request.status === "PENDING" ? "Pending" : item.request.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {item.type === "leave"
                    ? `${item.request.from_date.slice(0, 10)} to ${item.request.to_date.slice(0, 10)} · ${item.request.days} day(s)`
                    : item.type === "permission"
                      ? `${item.request.perm_date.slice(0, 10)} · ${item.request.start_time} · ${item.request.minutes} min`
                      : `${item.request.work_date.slice(0, 10)} · ${item.request.type.replace(/_/g, " ")}`}
                </p>
                {item.type === "regularization" && (item.request.claimed_in || item.request.claimed_out) && (
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {item.request.claimed_in && `Claimed in: ${item.request.claimed_in}`}
                    {item.request.claimed_in && item.request.claimed_out && " · "}
                    {item.request.claimed_out && `Claimed out: ${item.request.claimed_out}`}
                  </p>
                )}
                <p className="mt-2 break-words text-sm text-slate-700"><span className="font-semibold">Reason:</span> {item.request.reason || "Not provided"}</p>
                {item.request.status !== "PENDING" && (
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p className="break-words"><span className="font-semibold">Decision note:</span> {item.request.decision_note || "Not provided"}</p>
                    {item.request.decided_at && <p><span className="font-semibold">Decided:</span> {item.request.decided_at}</p>}
                  </div>
                )}
                {item.request.status === "PENDING" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["APPROVE", "REJECT"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={saving}
                      onClick={() => { setSelected(item); setAction(choice); setNote(""); setError(null); }}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                        isSelected && action === choice
                          ? choice === "APPROVE" ? "bg-blue-600 text-white" : "bg-rose-600 text-white"
                          : choice === "APPROVE" ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      {choice === "APPROVE" ? "Approve" : "Reject"}
                    </button>
                  ))}
                </div>
                )}
              </div>
            );
          })}
          {selected && (
            <div className="rounded-2xl border border-blue-100 bg-[#f6faff] p-4">
              <label htmlFor="attendance-decision-note" className="text-sm font-bold text-slate-700">
                {action === "APPROVE" ? "Approval" : "Rejection"} note <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="attendance-decision-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={saving}
                maxLength={1000}
                rows={3}
                placeholder="Enter a reason for your decision"
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">A decision note is required.</span>
                <button type="button" onClick={submit} disabled={saving || !note.trim()} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${action === "APPROVE" ? "bg-blue-600 hover:bg-blue-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {saving ? "Processing..." : `Confirm ${action === "APPROVE" ? "approval" : "rejection"}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
