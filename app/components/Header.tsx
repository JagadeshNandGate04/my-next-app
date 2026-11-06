
"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";
import type { AppDispatch } from "@/app/store/store";

import {
  changePassword,
  clearPasswordMessages,
  performLogout,
} from "@/app/store/auth/authSlice";

import {
  Search,
  Bell,
  ChevronDown,
  Users,
  CalendarDays,
  Clock,
  FileCheck,
  X,
  KeyRound,
  LogOut,
} from "lucide-react";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface HeaderProps {
  userInitials?: string;
  unreadNotifications?: boolean;
  onSearchChange?: (query: string) => void;
}

interface SearchResult {
  id: string;
  category: "Employee" | "Leave" | "Permission" | "Regularization";
  title: string;
  subtitle: string;
  details: string;
  status?: string;
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getInitials = (name?: string, fallback?: string) => {
  const value = name?.trim() || fallback?.trim() || "AD";
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
};

const getStatusColor = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "bg-rose-50 text-rose-700";
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

export default function Header({
  userInitials,
  unreadNotifications = true,
  onSearchChange,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // --------------------------------------------------
  // REDUX AUTHENTICATION
  // --------------------------------------------------

  const {
    user,
    isAuthenticated,
    changingPassword,
    passwordError,
    passwordSuccess,
  } = useSelector((state: RootState) => state.auth);

  // --------------------------------------------------
  // LOCAL STATES
  // --------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordFormError, setPasswordFormError] = useState("");

  // --------------------------------------------------
  // SEARCH DATA
  // --------------------------------------------------

  // Search API can be connected later.
  const allSearchResults = useMemo<SearchResult[]>(() => {
    return [];
  }, []);

  // --------------------------------------------------
  // LOGGED-IN USER DETAILS
  // --------------------------------------------------

  const displayName =
    user?.name ||
    user?.email?.split("@")[0] ||
    (isAuthenticated ? "Loading profile..." : "Administrator");

  const displayEmail = user?.email || "";
  const displayRole = user?.role || "Administrator";

  const avatarInitials =
    userInitials || getInitials(user?.name, user?.email);

  // --------------------------------------------------
  // FILTER SEARCH RESULTS
  // --------------------------------------------------

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    return allSearchResults
      .filter((item) => {
        const searchableText = [
          item.title,
          item.subtitle,
          item.details,
          item.category,
          item.status || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .slice(0, 30);
  }, [allSearchResults, searchQuery]);

  // --------------------------------------------------
  // SEARCH HANDLERS
  // --------------------------------------------------

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSearchOpen(true);
    onSearchChange?.(value);
  };

  // --------------------------------------------------
  // CHANGE PASSWORD HANDLERS
  // --------------------------------------------------

  const openChangePassword = () => {
    setProfileMenuOpen(false);

    setPasswordFormError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    dispatch(clearPasswordMessages());

    setChangePasswordOpen(true);
  };

  const closeChangePassword = () => {
    if (changingPassword) return;

    setChangePasswordOpen(false);

    setPasswordFormError("");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    dispatch(clearPasswordMessages());
  };

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPasswordFormError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFormError("Complete all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFormError("The new passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordFormError(
        "Choose a new password different from your current one."
      );
      return;
    }

    try {
      await dispatch(
        changePassword({
          old_password: currentPassword,
          new_password: newPassword,
        })
      );

      // Clear fields only after successful API response.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setPasswordFormError(
        error instanceof Error
          ? error.message
          : "Unable to change password. Please try again."
      );
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    setProfileMenuOpen(false);
    dispatch(performLogout());
    router.replace("/login");
  };

  // --------------------------------------------------
  // SEARCH CATEGORY ICONS
  // --------------------------------------------------

  const categoryIcon = (category: SearchResult["category"]) => {
    switch (category) {
      case "Employee":
        return <Users className="w-4 h-4" />;

      case "Leave":
        return <CalendarDays className="w-4 h-4" />;

      case "Permission":
        return <Clock className="w-4 h-4" />;

      case "Regularization":
        return <FileCheck className="w-4 h-4" />;
    }
  };

  // --------------------------------------------------
  // HIDE HEADER ON DASHBOARD
  // --------------------------------------------------

  if (pathname === "/dashboard" || pathname === "/") {
    return null;
  }

  // --------------------------------------------------
  // JSX
  // --------------------------------------------------

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xl border-b border-[#d6e5fb] shadow-sm">

        {/* TOP ACCENT */}

        <div className="h-[3px] bg-gradient-to-r from-[#0047BA] via-[#38A9F5] to-[#7BBDE8]" />

        <div className="min-h-[76px] px-4 md:px-8 flex items-center justify-between gap-4">

          {/* LEFT - GEOMETRIC DESIGN */}

          <div className="relative flex items-center flex-1 min-w-0 h-12 overflow-hidden">

            <div className="relative w-[280px] sm:w-[400px] h-12 shrink-0">

              <div className="absolute left-[55px] top-[11px] w-[260px] h-[29px] bg-[#E5ECF5] -skew-x-[25deg]" />

              <div className="absolute left-[28px] top-[24px] w-[185px] h-[12px] bg-[#38A9F5] -skew-x-[25deg]" />

              <div className="absolute left-[14px] top-[8px] w-[11px] h-[38px] bg-[#0047BA] -skew-x-[25deg]" />

              <div className="absolute left-[35px] top-[4px] w-[10px] h-[44px] bg-[#7BBDE8] -skew-x-[25deg]" />

              <div className="absolute left-[245px] top-[5px] w-[65px] h-[17px] bg-[#38A9F5] -skew-x-[25deg]" />

              <div className="absolute left-[330px] top-[12px] flex gap-2">
                <span className="w-2 h-8 bg-[#38A9F5] -skew-x-[25deg]" />
                <span className="w-2 h-8 bg-[#0047BA] -skew-x-[25deg]" />
                <span className="w-2 h-8 bg-[#7BBDE8] -skew-x-[25deg]" />
              </div>

              <div className="absolute left-[115px] top-[3px] w-24 h-[2px] bg-[#38A9F5]" />

              <div className="absolute left-[190px] bottom-[1px] w-20 h-[2px] bg-[#7BBDE8]" />

            </div>
          </div>

          {/* RIGHT - SEARCH, NOTIFICATIONS AND PROFILE */}

          <div className="flex items-center gap-3 md:gap-4 shrink-0">

            {/* SEARCH */}

            <div className="relative hidden md:block w-52 lg:w-72 group">

              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7BBDE8] group-focus-within:text-[#0047BA] z-10" />

              <input
                type="text"
                value={searchQuery}
                placeholder="Search employees, requests..."
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 180);
                }}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5fb] text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-[#38A9F5] focus:ring-4 focus:ring-[#38A9F5]/10"
              />

              {searchQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSearchChange("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* SEARCH RESULTS DROPDOWN */}

              {searchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 top-full mt-3 w-[360px] lg:w-[440px] max-h-[440px] overflow-y-auto rounded-2xl border border-[#d6e5fb] bg-white shadow-xl z-50">

                  <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-[#17365D]">
                      Search Results
                    </p>

                    <p className="text-xs text-slate-400 mt-0.5">
                      Employees and requests
                    </p>
                  </div>

                  {filteredResults.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />

                      <p className="text-xs font-semibold text-slate-600">
                        Search is temporarily unavailable
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Search data will be available when the search service is connected.
                      </p>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {filteredResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchQuery(item.title);
                          onSearchChange?.(item.title);
                          setSearchOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#f5f9ff] transition-colors flex items-start gap-3"
                      >
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-[#edf5ff] text-[#0047BA] flex items-center justify-center">
                          {categoryIcon(item.category)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {item.title}
                            </p>

                            {item.status && (
                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-[#0047BA] mt-0.5">
                            {item.category} · {item.subtitle}
                          </p>

                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {item.details}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                </div>
              )}

            </div>

            {/* NOTIFICATIONS */}

            <button
              type="button"
              aria-label="View notifications"
              className="relative w-10 h-10 rounded-xl border border-[#d6e5fb] bg-white flex items-center justify-center text-slate-500 hover:bg-[#f0f7ff] hover:text-[#0047BA] transition-all"
            >
              <Bell className="w-[18px] h-[18px]" />

              {unreadNotifications && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* LOGGED-IN USER PROFILE */}

            <div className="relative pl-3 border-l border-[#d6e5fb]">

              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0047BA] to-[#38A9F5] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {avatarInitials}
                </div>

                <div className="hidden lg:block max-w-[150px]">
                  <p className="text-xs font-bold text-[#17365D] truncate">
                    {displayName}
                  </p>

                  <p className="text-xs text-slate-400 truncate">
                    {displayEmail || displayRole}
                  </p>
                </div>

                <ChevronDown className="hidden lg:block w-4 h-4 text-slate-400" />
              </button>

              {/* PROFILE DROPDOWN */}

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[#d6e5fb] bg-white p-2 shadow-xl z-50"
                >
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-[#17365D]">
                      {displayName}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {displayEmail || "Email unavailable"}
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {displayRole}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={openChangePassword}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#f0f7ff] hover:text-[#0047BA]"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------
          CHANGE PASSWORD MODAL
          CENTERED VERTICALLY AND HORIZONTALLY
      -------------------------------------------------- */}

      {changePasswordOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeChangePassword();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="relative my-auto w-full max-w-md rounded-3xl border border-[#d5dbe1] bg-white p-6 shadow-2xl"
          >

            {/* MODAL HEADER */}

            <div className="mb-6 flex items-start justify-between gap-3">

              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf5ff] text-[#0047BA]">
                  <KeyRound className="h-5 w-5" />
                </div>

                <h2
                  id="change-password-title"
                  className="text-lg font-black text-[#0f172a]"
                >
                  Change password
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter your current password and choose a new one.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close change password dialog"
                onClick={closeChangePassword}
                disabled={changingPassword}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* PASSWORD FORM */}

            <form onSubmit={handleChangePassword} className="space-y-4">

              <label className="block text-xs font-semibold text-slate-700">
                Current password

                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(event.target.value)
                  }
                  placeholder="Enter current password"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition-all focus:border-[#38A9F5] focus:ring-2 focus:ring-[#38A9F5]/20"
                  required
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                New password

                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="Enter new password"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition-all focus:border-[#38A9F5] focus:ring-2 focus:ring-[#38A9F5]/20"
                  required
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Confirm new password

                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm new password"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition-all focus:border-[#38A9F5] focus:ring-2 focus:ring-[#38A9F5]/20"
                  required
                />
              </label>

              {/* ERROR MESSAGE */}

              {(passwordFormError || passwordError) && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-rose-600">
                    {passwordFormError || passwordError}
                  </p>
                </div>
              )}

              {/* SUCCESS MESSAGE */}

              {passwordSuccess && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5"
                >
                  <p className="text-xs font-semibold text-emerald-700">
                    {passwordSuccess}
                  </p>
                </div>
              )}

              {/* ACTION BUTTONS */}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeChangePassword}
                  disabled={changingPassword}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#1b64da] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1552b5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {changingPassword ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      Update password
                    </>
                  )}
                </button>

              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
