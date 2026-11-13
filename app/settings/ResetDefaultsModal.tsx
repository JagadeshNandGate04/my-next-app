"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, X } from "lucide-react";

export default function ResetDefaultsModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const modalRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <section ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="reset-defaults-title"
        aria-describedby="reset-defaults-description"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
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
        }}>
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-[#f1f8fe] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1b64da]">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="reset-defaults-title" className="text-lg font-black text-slate-900">Reset to defaults?</h2>
              <p id="reset-defaults-description" className="mt-1 text-sm text-slate-600">
                Reset the current operational policy settings to their default values?
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close reset confirmation"
            className="rounded-xl p-2 text-slate-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            This changes the form only. Select <strong>Save All Settings</strong> afterward to apply the defaults.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button ref={cancelRef} type="button" onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
              Cancel
            </button>
            <button type="button" onClick={onConfirm}
              className="rounded-xl bg-[#1b64da] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1552b5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              Reset to defaults
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
