"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Megaphone, X } from "lucide-react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { sendAdminAnnouncement } from "../store/notifications/notification";

export default function AnnouncementModal({ onClose }: { onClose: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const sendingRef = useRef(false);
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendingRef.current) return;

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      setError("Enter both a title and a message.");
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const count = await dispatch(
        sendAdminAnnouncement({ title: trimmedTitle, message: trimmedMessage })
      ).unwrap();
      setRecipientCount(count);
    } catch (error) {
      setError(error instanceof Error ? error.message : (
        typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
          ? error.message
          : "Unable to send the announcement. Please try again."
      ));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !sending) onClose();
          if (event.key !== "Tab") return;
          const elements = modalRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), textarea:not(:disabled)"
          );
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
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="announcement-title" className="text-lg font-black text-slate-900">Send announcement</h2>
              <p className="mt-1 text-sm text-slate-600">Share an update with all active employees.</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={sending} aria-label="Close announcement" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {recipientCount !== null ? (
          <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-semibold">
                Announcement sent to {recipientCount} {recipientCount === 1 ? "employee" : "employees"}.
              </p>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-xl bg-[#1b64da] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 overflow-y-auto p-5 sm:p-6">
            <div>
              <label htmlFor="announcement-subject" className="text-sm font-bold text-slate-700">Title <span className="text-rose-600">*</span></label>
              <input id="announcement-subject" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={sending} placeholder="Important update" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
            </div>
            <div>
              <label htmlFor="announcement-message" className="text-sm font-bold text-slate-700">Message <span className="text-rose-600">*</span></label>
              <textarea id="announcement-message" value={message} onChange={(event) => setMessage(event.target.value)} required disabled={sending} rows={5} placeholder="Write your announcement here..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50" />
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={onClose} disabled={sending} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={sending} className="flex items-center gap-2 rounded-xl bg-[#1b64da] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {sending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {sending ? "Sending..." : "Send announcement"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
