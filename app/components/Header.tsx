
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";

import {
  Search,
  Bell,
  ChevronDown,
  Loader2,
  Users,
  CalendarDays,
  Clock,
  FileCheck,
  X,
} from "lucide-react";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface HeaderProps {
  userInitials?: string;
  unreadNotifications?: boolean;
  onSearchChange?: (query: string) => void;
}

interface Employee {
  id: string;
  emp_code: string;
  name: string;
  designation: string;
}

interface LeaveRequest {
  id: number;
  employee_name?: string;
  emp_code?: string;
  from_date?: string;
  to_date?: string;
  reason?: string;
  status?: string;
}

interface PermissionRequest {
  id: number;
  employee_name?: string;
  emp_code?: string;
  perm_date?: string;
  minutes?: number;
  reason?: string;
  status?: string;
}

interface RegularizationRequest {
  id: number;
  work_date?: string;
  type?: string;
  reason?: string;
  status?: string;
  employee?: {
    name?: string;
    emp_code?: string;
  };
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
// CONFIGURATION
// --------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

const REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const formatDate = (value?: string) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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

  // Redux authentication details
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // API data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // --------------------------------------------------
  // LOGGED-IN USER DETAILS
  // --------------------------------------------------

  const displayName =
    user?.name || user?.email?.split("@")[0] || "Administrator";

  const displayEmail = user?.email || "";

  const displayRole = user?.role || "Administrator";

  const avatarInitials =
    userInitials || getInitials(user?.name, user?.email);

  // --------------------------------------------------
  // FETCH SEARCH DATA
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchSearchData = async () => {
      // Do not fetch search data on Dashboard
      if (pathname === "/dashboard" || pathname === "/") {
        setLoading(false);
        return;
      }

      if (!token) {
        setSearchError("Please sign in again.");
        setLoading(false);
        return;
      }

      if (!API_URL) {
        setSearchError("API URL is not configured.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setSearchError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        // ------------------------------------------
        // 1. FETCH ACTIVE EMPLOYEES
        // ------------------------------------------

        const dashboardResponse = await fetch(
          `${API_URL}/api/v1/admin/dashboard?period=day`,
          { headers }
        );

        const dashboardResult = await dashboardResponse.json();

        if (!dashboardResponse.ok || !dashboardResult.success) {
          throw new Error(
            dashboardResult.message || "Unable to load employees."
          );
        }

        const activeEmployees: Employee[] =
          dashboardResult.data?.active_employees || [];

        // ------------------------------------------
        // 2. FETCH REQUESTS BY STATUS
        // ------------------------------------------

        const fetchRequests = async <T extends { id: number }>(
          endpoint: string
        ): Promise<T[]> => {
          const responses = await Promise.all(
            REQUEST_STATUSES.map(async (status) => {
              const response = await fetch(
                `${API_URL}${endpoint}?status=${status}`,
                { headers }
              );

              const result = await response.json();

              if (!response.ok || !result.success) {
                throw new Error(
                  result.message || "Unable to load request data."
                );
              }

              return (result.data?.requests || []) as T[];
            })
          );

          // Remove duplicate records
          const uniqueRequests = new Map<number, T>();

          responses.flat().forEach((request) => {
            uniqueRequests.set(request.id, request);
          });

          return Array.from(uniqueRequests.values());
        };

        // ------------------------------------------
        // 3. FETCH ALL THREE REQUEST TYPES
        // ------------------------------------------

        const [
          leaves,
          permissions,
          regularizations,
        ] = await Promise.all([
          fetchRequests<LeaveRequest>(
            "/api/v1/leave/admin/requests"
          ),

          fetchRequests<PermissionRequest>(
            "/api/v1/permission/admin/permissions"
          ),

          fetchRequests<RegularizationRequest>(
            "/api/v1/regularization/admin/requests"
          ),
        ]);

        if (!cancelled) {
          setEmployees(activeEmployees);
          setLeaveRequests(leaves);
          setPermissionRequests(permissions);
          setRegularizationRequests(regularizations);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchError(
            error instanceof Error
              ? error.message
              : "Unable to load search data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSearchData();

    return () => {
      cancelled = true;
    };
  }, [token, pathname]);

  // --------------------------------------------------
  // COMBINE ALL SEARCH DATA
  // --------------------------------------------------

  const allSearchResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    // Employees
    employees.forEach((employee) => {
      results.push({
        id: `employee-${employee.id}`,
        category: "Employee",
        title: employee.name,
        subtitle: employee.emp_code,
        details: employee.designation,
      });
    });

    // Leave requests
    leaveRequests.forEach((request) => {
      results.push({
        id: `leave-${request.id}`,
        category: "Leave",
        title: request.employee_name || "Unknown Employee",
        subtitle: request.emp_code || "Leave Request",
        details: `${formatDate(request.from_date)} - ${formatDate(
          request.to_date
        )}${request.reason ? ` · ${request.reason}` : ""}`,
        status: request.status,
      });
    });

    // Permission requests
    permissionRequests.forEach((request) => {
      results.push({
        id: `permission-${request.id}`,
        category: "Permission",
        title: request.employee_name || "Unknown Employee",
        subtitle: request.emp_code || "Permission Request",
        details: `${formatDate(request.perm_date)} · ${
          request.minutes ?? 0
        } minutes${request.reason ? ` · ${request.reason}` : ""}`,
        status: request.status,
      });
    });

    // Regularization requests
    regularizationRequests.forEach((request) => {
      results.push({
        id: `regularization-${request.id}`,
        category: "Regularization",
        title: request.employee?.name || "Unknown Employee",
        subtitle:
          request.employee?.emp_code || "Regularization Request",
        details: `${formatDate(request.work_date)}${
          request.type
            ? ` · ${request.type.replace(/_/g, " ")}`
            : ""
        }${request.reason ? ` · ${request.reason}` : ""}`,
        status: request.status,
      });
    });

    return results;
  }, [
    employees,
    leaveRequests,
    permissionRequests,
    regularizationRequests,
  ]);

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
  // IMPORTANT: CONDITIONAL RETURN AFTER ALL HOOKS
  // --------------------------------------------------

  if (pathname === "/dashboard" || pathname === "/") {
    return null;
  }

  // --------------------------------------------------
  // JSX
  // --------------------------------------------------

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xl border-b border-[#d6e5fb] shadow-sm">

      {/* Top Accent */}
      <div className="h-[3px] bg-gradient-to-r from-[#0047BA] via-[#38A9F5] to-[#7BBDE8]" />

      <div className="min-h-[76px] px-4 md:px-8 flex items-center justify-between gap-4">

        {/* LEFT - GEOMETRIC DESIGN */}
        <div className="relative flex items-center flex-1 min-w-0 h-12 overflow-hidden">

          <div className="relative w-[280px] sm:w-[400px] h-12 shrink-0">

            {/* Main White Geometric Plate */}
            <div className="absolute left-[55px] top-[11px] w-[260px] h-[29px] bg-[#E5ECF5] -skew-x-[25deg]" />

            {/* Cyan Under Ribbon */}
            <div className="absolute left-[28px] top-[24px] w-[185px] h-[12px] bg-[#38A9F5] -skew-x-[25deg]" />

            {/* Royal Blue Accent */}
            <div className="absolute left-[14px] top-[8px] w-[11px] h-[38px] bg-[#0047BA] -skew-x-[25deg]" />

            {/* Sky Blue Accent */}
            <div className="absolute left-[35px] top-[4px] w-[10px] h-[44px] bg-[#7BBDE8] -skew-x-[25deg]" />

            {/* Secondary Blue Ribbon */}
            <div className="absolute left-[245px] top-[5px] w-[65px] h-[17px] bg-[#38A9F5] -skew-x-[25deg]" />

            {/* Small Geometric Stripes */}
            <div className="absolute left-[330px] top-[12px] flex gap-2">
              <span className="w-2 h-8 bg-[#38A9F5] -skew-x-[25deg]" />
              <span className="w-2 h-8 bg-[#0047BA] -skew-x-[25deg]" />
              <span className="w-2 h-8 bg-[#7BBDE8] -skew-x-[25deg]" />
            </div>

            {/* Thin Accent Lines */}
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

                <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">

                  <div>
                    <p className="text-xs font-bold text-[#17365D]">
                      Search Results
                    </p>

                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Employees and requests
                    </p>
                  </div>

                  {loading && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0047BA]" />
                  )}

                </div>

                {searchError && (
                  <div className="px-4 py-3 text-xs text-rose-600 bg-rose-50">
                    {searchError}
                  </div>
                )}

                {!loading &&
                  filteredResults.length === 0 &&
                  !searchError && (
                    <div className="px-4 py-8 text-center">

                      <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />

                      <p className="text-xs font-semibold text-slate-600">
                        No matching results
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1">
                        Try another employee name, ID, or request keyword.
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
                              className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${getStatusColor(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          )}

                        </div>

                        <p className="text-[10px] font-semibold text-[#0047BA] mt-0.5">
                          {item.category} · {item.subtitle}
                        </p>

                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {item.details}
                        </p>

                      </div>

                    </button>
                  ))}

                </div>

                {filteredResults.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                    <p className="text-[10px] text-slate-400">
                      Showing {filteredResults.length} matching results
                    </p>
                  </div>
                )}

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
          <div className="flex items-center gap-2 pl-3 border-l border-[#d6e5fb]">

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0047BA] to-[#38A9F5] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {avatarInitials}
            </div>

            <div className="hidden lg:block max-w-[150px]">

              <p className="text-xs font-bold text-[#17365D] truncate">
                {displayName}
              </p>

              <p className="text-[10px] text-slate-400 truncate">
                {displayEmail || displayRole}
              </p>

            </div>

            <ChevronDown className="hidden lg:block w-4 h-4 text-slate-400" />

          </div>

        </div>
      </div>
    </header>
  );
}
