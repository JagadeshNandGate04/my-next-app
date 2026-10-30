
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import type { AppDispatch } from "../store/store";
import { login } from "../store/auth/authSlice";

/* ------------------------------------------------------------------ */
/* API CONFIGURATION                                                    */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

const getApiUrl = () => {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured in .env.local");
  }

  return API_URL;
};

const getErrorMessage = (data: any, fallback: string) => {
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.error?.message === "string") {
    return data.error.message;
  }
  return fallback;
};

const postAuthRequest = async (endpoint: string, body: object) => {
  const response = await fetch(`${getApiUrl()}/api/v1/auth/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result) {
    throw new Error(
      getErrorMessage(
        result,
        `Request failed with status ${response.status}`
      )
    );
  }

  if (!result.success) {
    throw new Error(getErrorMessage(result, "Something went wrong."));
  }

  return result;
};

/* ------------------------------------------------------------------ */
/* ICONS                                                               */
/* ------------------------------------------------------------------ */

const UserIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const ClockIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ArrowRight = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

const WalletIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3 11h18" />
  </svg>
);

const PhoneIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
  </svg>
);

const GoogleIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const MicrosoftIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
    <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
    <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* LEFT PANEL CARDS                                                     */
/* ------------------------------------------------------------------ */

const glass =
  "rounded-[20px] border border-white/40 bg-white/[0.18] shadow-[0_6px_20px_rgba(40,110,180,0.08)] backdrop-blur-[3px]";

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return { time: "08:45:22", meridiem: "AM" };
  }

  const h = now.getHours();
  const pad = (n: number) => n.toString().padStart(2, "0");

  return {
    time: `${pad(h % 12 || 12)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    meridiem: h >= 12 ? "PM" : "AM",
  };
}

function ActiveShiftCard() {
  const { time, meridiem } = useLiveClock();

  return (
    <div className={`${glass} w-[315px] p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <span className="mt-[5px] h-2 w-2 rounded-full bg-[#1a5c96]" />
          <p className="text-[11px] font-bold leading-[1.45] tracking-[0.14em] text-[#1d4f7c]">
            ACTIVE SHIFT
            <br />
            TRACKER
          </p>
        </div>

        <span className="rounded-full bg-white/50 px-3 py-2 text-center text-[10px] font-bold leading-tight tracking-wider text-[#1d4f7c]">
          ON
          <br />
          TIME
        </span>
      </div>

      <div className="mt-3 border-t border-white/40 pt-3">
        <div className="flex items-end justify-between">
          <p className="text-[31px] font-extrabold leading-none tracking-tight text-[#0d3d66]">
            {time}
            <span className="ml-1 text-[14px] font-bold text-[#1a74b8]">
              {meridiem}
            </span>
          </p>
          <p className="text-[11px] font-semibold text-[#2d5f8a]">
            Shift: Morning A
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/30 px-3 py-2.5">
          <span className="flex items-center gap-2 text-[12px] font-semibold text-[#1d4f7c]">
            <ClockIcon className="h-4 w-4" />
            Punch In: 08:30 AM
          </span>
          <span className="text-[12px] font-bold text-[#1a74b8]">
            +15m Early
          </span>
        </div>
      </div>
    </div>
  );
}

function WeeklyTimesheetCard() {
  const rows = [
    { day: "Mon - 8h 05m", badge: "Verified", type: "verified" },
    { day: "Tue - 8h 12m", badge: "Verified", type: "verified" },
    { day: "Wed - 8h 30m", badge: "+30m OT", type: "ot" },
    { day: "Thu - Today", badge: "In Progress", type: "progress" },
  ] as const;

  return (
    <div className={`${glass} w-[282px] rounded-[18px] p-3`}>
      <div className="flex items-center justify-between px-1 pb-2 pt-1">
        <p className="text-[11px] font-bold tracking-[0.12em] text-[#1d4f7c]">
          WEEKLY TIMESHEET
        </p>
        <p className="text-[11px] font-bold text-[#1a74b8]">
          38.5 / 40 hrs
        </p>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.day} className="flex items-center justify-between rounded-md bg-white/35 px-2.5 py-[7px]">
            <span className="text-[11px] font-medium text-[#1d4f7c]">
              {r.day}
            </span>

            {r.type === "verified" && (
              <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#1a74b8]">
                {r.badge}
              </span>
            )}

            {r.type === "ot" && (
              <span className="rounded bg-[#f6e3a6] px-2 py-0.5 text-[10px] font-bold text-[#8a5a00]">
                {r.badge}
              </span>
            )}

            {r.type === "progress" && (
              <span className="text-[10px] font-bold text-[#1a74b8]">
                {r.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PayrollSnapshotCard() {
  return (
    <div className={`${glass} w-[314px] rounded-[18px] p-4`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] text-[#1d4f7c]">
          <WalletIcon className="h-4 w-4" />
          PAYROLL SNAPSHOT
        </span>
        <span className="text-[11px] font-semibold text-[#1a74b8]">
          Bi-Weekly
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[26px] font-extrabold tracking-tight text-[#0d3d66]">
          ₹85,450.00
        </p>
        <span className="rounded bg-white/60 px-2 py-1 text-[11px] font-bold text-[#1a74b8]">
          100% Calculated
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-2.5 text-[11px]">
        <span className="font-medium text-[#3a6a93]">
          Auto Disbursement: Friday
        </span>
        <span className="flex items-center gap-1 font-bold text-[#1a74b8]">
          <CheckIcon className="h-3 w-3" />
          Approved
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FORGOT PASSWORD MODAL                                                */
/* ------------------------------------------------------------------ */

type ResetStep = "email" | "otp" | "password";

function ForgotPasswordModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);

      const result = await postAuthRequest("forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setSuccess(
        result.message ||
          "If an account exists with this email, a password reset OTP has been sent."
      );

      setStep("otp");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const result = await postAuthRequest("verify-reset-otp", {
        email: email.trim().toLowerCase(),
        otp: otp,
      });

      const token = result.data?.reset_token;

      if (!token) {
        throw new Error(
          "The server did not return a reset token. Please try again."
        );
      }

      setResetToken(token);
      setSuccess("OTP verified successfully.");
      setStep("password");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword.length > 128) {
      setError("Password cannot exceed 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await postAuthRequest("reset-password", {
        email: email.trim().toLowerCase(),
        reset_token: resetToken,
        new_password: newPassword,
      });

      setSuccess(
        result.message || "Your password has been reset successfully."
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2945]/50 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="relative w-full max-w-[480px] rounded-[28px] bg-white p-7 shadow-2xl sm:p-9">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close forgot password"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200 disabled:opacity-50"
        >
          ×
        </button>

        <div className="mb-7">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf5fd] text-[#1a6ea8]">
            {step === "email" && (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            )}
            {step === "otp" && (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="5" y="3" width="14" height="18" rx="3" />
                <path d="M9 8h6M9 12h.01M12 12h.01M15 12h.01M9 16h6" />
              </svg>
            )}
            {step === "password" && (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 118 0v3M12 14v3" />
              </svg>
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a74b8]">
            Account Recovery
          </p>

          <h2 className="mt-2 text-3xl font-extrabold text-[#0d3d66]">
            {step === "email" && "Forgot Password?"}
            {step === "otp" && "Verify Your OTP"}
            {step === "password" && "Create New Password"}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {step === "email" &&
              "Enter your registered work email. We will send you a password reset OTP."}
            {step === "otp" &&
              `Enter the 6-digit verification code sent to ${email}.`}
            {step === "password" &&
              "Your email has been verified. Enter your new password below."}
          </p>
        </div>

        {/* STEP INDICATOR */}

        <div className="mb-7 flex items-center gap-2">
          {(["email", "otp", "password"] as ResetStep[]).map(
            (item, index) => {
              const activeIndex = ["email", "otp", "password"].indexOf(step);
              const completed = index < activeIndex;
              const active = index === activeIndex;

              return (
                <div key={item} className="flex flex-1 items-center gap-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      completed || active
                        ? "bg-[#398fd0] text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {completed ? "✓" : index + 1}
                  </div>
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      index < activeIndex ? "bg-[#398fd0]" : "bg-slate-100"
                    }`}
                  />
                </div>
              );
            }
          )}
        </div>

        {/* EMAIL STEP */}

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#0f2a40]">
                Registered Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@company.com"
                autoComplete="email"
                required
                disabled={loading}
                className="h-14 w-full rounded-xl border border-[#cdd5de] px-4 text-sm text-[#0f2a40] outline-none transition focus:border-[#5aaee3] focus:ring-4 focus:ring-[#5aaee3]/15 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7dbbe9] to-[#5aaee3] font-bold text-[#0d3556] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send Verification OTP"}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>
        )}

        {/* OTP STEP */}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#0f2a40]">
                6-Digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="Enter 6-digit OTP"
                required
                disabled={loading}
                className="h-14 w-full rounded-xl border border-[#cdd5de] px-4 text-center text-xl font-bold tracking-[0.5em] text-[#0f2a40] outline-none transition focus:border-[#5aaee3] focus:ring-4 focus:ring-[#5aaee3]/15 disabled:bg-slate-50"
              />
              <p className="mt-2 text-xs text-slate-400">
                The OTP is valid for 5 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7dbbe9] to-[#5aaee3] font-bold text-[#0d3556] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
                setSuccess("");
              }}
              className="w-full text-sm font-semibold text-[#1a6ea8] hover:underline"
            >
              Change email address
            </button>
          </form>
        )}

        {/* NEW PASSWORD STEP */}

        {step === "password" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#0f2a40]">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                disabled={loading}
                className="h-14 w-full rounded-xl border border-[#cdd5de] px-4 text-sm text-[#0f2a40] outline-none transition focus:border-[#5aaee3] focus:ring-4 focus:ring-[#5aaee3]/15 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#0f2a40]">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                disabled={loading}
                className="h-14 w-full rounded-xl border border-[#cdd5de] px-4 text-sm text-[#0f2a40] outline-none transition focus:border-[#5aaee3] focus:ring-4 focus:ring-[#5aaee3]/15 disabled:bg-slate-50"
              />
            </div>

            <p className="text-xs text-slate-400">
              Password must be between 8 and 128 characters.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7dbbe9] to-[#5aaee3] font-bold text-[#0d3556] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting Password..." : "Reset Password"}
              {!loading && <CheckIcon className="h-5 w-5" />}
            </button>
          </form>
        )}

        {/* ERROR / SUCCESS */}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {success}
          </div>
        )}

        {/* RESET COMPLETE */}

        {step === "password" && success && !loading && !error && (
          <button
            type="button"
            onClick={resetToLogin}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#0d5f96] font-bold text-white transition hover:bg-[#094d7c]"
          >
            Back to Sign In
          </button>
        )}

        <div className="mt-7 border-t border-slate-100 pt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm font-semibold text-slate-500 hover:text-[#1a6ea8] disabled:opacity-50"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOGIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError("");

    if (!identifier.trim() || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    try {
      setSubmitting(true);

      await dispatch(
        login({
          email: identifier.trim(),
          password,
        })
      );

      router.push("/dashboard");
    } catch (error: unknown) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7ff] px-4 py-10">
        <div className="relative grid w-full max-w-[1400px] overflow-hidden rounded-[40px] bg-white shadow-[0_30px_80px_-20px_rgba(60,130,200,0.25)] xl:min-h-[865px] xl:grid-cols-2">

          {/* LEFT PANEL */}

          <section
            className="relative hidden h-[865px] overflow-hidden xl:block"
            style={{
              backgroundColor: "#86c0ea",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1.2px), linear-gradient(160deg, #94c9ee 0%, #7ab8e6 55%, #84bfe9 100%)",
              backgroundSize: "22px 22px, 100% 100%",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 select-none"
            >
              <div className="absolute left-[355px] top-[48px]">
                <ActiveShiftCard />
              </div>

              <div className="absolute left-[385px] top-[238px]">
                <WeeklyTimesheetCard />
              </div>

              <div className="absolute left-[355px] top-[695px]">
                <PayrollSnapshotCard />
              </div>
            </div>

            <div className="absolute left-[70px] top-[72px] z-10">
              <div
                className="inline-block bg-[#0a47b3] py-1.5 pl-5 pr-7 text-[22px] font-semibold tracking-wide text-white"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
                }}
              >
                NANDGATE-IT
              </div>

              <p className="mt-3 text-[13px] font-bold tracking-[0.2em] text-[#12507f]">
                ATTENDANCE &amp; PAYROLL
              </p>
            </div>

            <div className="absolute left-[70px] top-[352px] z-10">
              <h2 className="text-[54px] font-extrabold leading-[1.05] tracking-tight">
                <span className="block text-[#0b3d63]">
                  Seamless Shifts.
                </span>
                <span className="block text-[#0b6aa6]">
                  Accurate Payroll.
                </span>
              </h2>

              <p className="mt-6 max-w-[480px] text-[16px] leading-relaxed text-[#12395c]">
                Automate punch tracking, overtime calculations, and
                multi-tier payroll disbursements with enterprise precision.
              </p>

              <div className="mt-8 h-[2px] w-[230px] bg-gradient-to-r from-[#1d5f93] via-white/80 to-transparent" />
            </div>
          </section>

          {/* CENTER ARROW */}

          <div className="pointer-events-none absolute left-1/2 top-[382px] z-20 hidden h-[100px] w-[100px] -translate-x-1/2 items-center justify-center rounded-full bg-white/40 shadow-[0_10px_30px_rgba(30,90,150,0.2)] backdrop-blur-sm xl:flex">
            <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-gradient-to-b from-[#6db3e6] to-[#3f8fd2] text-white shadow-inner ring-4 ring-white/70">
              <ArrowRight className="h-9 w-9" />
            </div>
          </div>

          {/* RIGHT PANEL */}

          <section className="flex flex-col justify-start px-8 py-14 sm:px-16 lg:px-[110px] xl:pt-[80px]">
            <h1 className="text-[44px] font-extrabold leading-tight tracking-tight text-[#0f5a8c]">
              Welcome Back!
            </h1>

            <p className="mt-3 max-w-[420px] text-[16px] leading-snug text-[#2b3a4a]">
              Log in to record attendance, manage timesheets, and view payroll.
            </p>

            <form onSubmit={onSubmit} className="mt-12 w-full max-w-[480px]">

              {/* EMAIL / EMPLOYEE ID */}

              <label
                htmlFor="identifier"
                className="block text-[18px] font-bold text-[#0f2a40]"
              >
                Work Email or Employee ID
              </label>

              <div className="relative mt-3">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setLoginError("");
                  }}
                  placeholder="e.g. EMP-4092 or alex@company.com"
                  autoComplete="username"
                  required
                  disabled={submitting}
                  className="h-[66px] w-full rounded-full border border-[#cdd5de] bg-white pl-6 pr-14 text-[17px] text-[#0f2a40] placeholder:text-[#9aa5b1] focus:border-[#5aaee3] focus:outline-none focus:ring-4 focus:ring-[#5aaee3]/20 disabled:bg-slate-50"
                />

                <UserIcon className="pointer-events-none absolute right-6 top-1/2 h-6 w-6 -translate-y-1/2 text-[#8a96a3]" />
              </div>

              {/* PASSWORD */}

              <div className="mt-7 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[18px] font-bold text-[#0f2a40]"
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setLoginError("");
                  }}
                  className="text-[14px] font-bold text-[#1a6ea8] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={submitting}
                className="mt-3 h-[66px] w-full rounded-full border border-[#cdd5de] bg-white px-6 text-[17px] text-[#0f2a40] placeholder:text-[#9aa5b1] focus:border-[#5aaee3] focus:outline-none focus:ring-4 focus:ring-[#5aaee3]/20 disabled:bg-slate-50"
              />

              {/* REMEMBER + AUTO CLOCK-IN */}

              <div className="mt-7 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-3 text-[17px] text-[#1c2b3a]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-5 w-5 cursor-pointer appearance-none rounded-full border border-[#b9c3cf] bg-white checked:border-[#3f8fd2] checked:bg-[#3f8fd2] checked:shadow-[inset_0_0_0_4px_white]"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-[#5aaee3] bg-[#eaf5fd] px-3.5 py-1.5 text-[13px] font-bold text-[#1a6ea8] hover:bg-[#dbeefb]"
                >
                  <ClockIcon className="h-4 w-4" />
                  Auto Clock-In
                </button>
              </div>

              {/* LOGIN ERROR */}

              {loginError && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {loginError}
                </div>
              )}

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={submitting}
                className="mt-9 flex h-[68px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7dbbe9] to-[#5aaee3] text-[20px] font-bold text-[#0d3556] shadow-[0_14px_30px_-8px_rgba(70,150,215,0.55)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing In..." : "Sign In & Clock In"}
                {!submitting && <ArrowRight className="h-5 w-5" />}
              </button>

              {/* DIVIDER */}

              <div className="mt-9 flex items-center gap-4">
                <span className="h-px flex-1 bg-[#dde3ea]" />
                <span className="text-center text-[16px] text-[#2b3a4a]">
                  or continue with corporate ID / SSO
                </span>
                <span className="h-px flex-1 bg-[#dde3ea]" />
              </div>

              {/* SSO BUTTONS */}

              <div className="mt-8 grid grid-cols-3 gap-5">
                {[
                  {
                    label: "Phone",
                    icon: <PhoneIcon className="h-6 w-6 text-[#3f8fd2]" />,
                  },
                  {
                    label: "Google",
                    icon: <GoogleIcon className="h-6 w-6" />,
                  },
                  {
                    label: "Microsoft",
                    icon: <MicrosoftIcon className="h-6 w-6" />,
                  },
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    aria-label={`Continue with ${b.label}`}
                    className="flex h-[60px] items-center justify-center rounded-full border border-[#cdd5de] bg-white transition hover:bg-slate-50"
                  >
                    {b.icon}
                  </button>
                ))}
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* FORGOT PASSWORD MODAL */}

      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </>
  );
}
