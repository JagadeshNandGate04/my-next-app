"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  CalendarDays,
  Contact,
  FolderOpen,
  Landmark,
  LayoutGrid,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store/store";
import { fetchEmployeeById, type Employee } from "@/app/store/employee/employeeSlice";
import { PROFILE_SECTIONS } from "../profileSections";

const PROFILE_CATEGORIES = [
  { id: "all", label: "All", Icon: LayoutGrid },
  { id: "personal", label: "Personal", Icon: Contact },
  { id: "contact", label: "Contact", Icon: Phone },
  { id: "dates", label: "Dates", Icon: CalendarDays },
  { id: "family", label: "Family", Icon: Users },
  { id: "docs", label: "Documents", Icon: FolderOpen },
  { id: "details", label: "Bank & Address", Icon: Landmark },
  { id: "qualification", label: "Experience", Icon: BriefcaseBusiness },
  { id: "profile", label: "Photo", Icon: Camera },
] as const;

interface EmployeeProfileResult {
  id: string;
  employee?: Employee;
  error?: string;
}

const getEmployeeProfileValue = (employee: Employee, key: string): string => {
  switch (key) {
    case "p.officialEmail":
    case "c.email":
      return employee.email;
    case "c.mobile":
      return employee.phone;
    case "d.doj":
      return employee.date_of_joining;
    default:
      return "";
  }
};

export default function EmployeeProfileDetailsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const employeeId = /^\d+$/.test(id) ? Number(id) : null;
  const [result, setResult] = useState<EmployeeProfileResult | null>(null);
  const [activeCategory, setActiveCategory] = useState("personal");

  useEffect(() => {
    if (employeeId === null) return;

    let active = true;
    void dispatch(fetchEmployeeById({ id: employeeId }))
      .then((employee) => {
        if (active) setResult({ id: String(employeeId), employee });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({
          id: String(employeeId),
          error: error instanceof Error ? error.message : "Could not load employee details.",
        });
      });

    return () => {
      active = false;
    };
  }, [dispatch, employeeId]);

  const currentResult = result?.id === id ? result : null;
  const employee = currentResult?.employee;
  const loading = employeeId !== null && currentResult === null;

  return (
    <main className="min-h-screen bg-[#f0f6fa] py-4 font-sans text-[#0f172a] antialiased sm:py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1880px] space-y-6 px-3 sm:px-5 lg:px-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-full border border-[#d6e8f7] bg-white px-4 py-2 text-sm font-bold text-[#1552b5] shadow-sm transition hover:bg-[#eaf5fd]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Employee Directory
        </Link>

        {employeeId === null ? (
          <section role="alert" className="rounded-3xl border border-red-200 bg-white p-8 text-center text-sm font-semibold text-red-700 shadow-sm">
            Invalid employee ID.
          </section>
        ) : loading ? (
          <section role="status" className="rounded-3xl border border-[#e6edf4] bg-white p-10 text-center text-sm font-semibold text-slate-600 shadow-sm">
            Loading employee profile...
          </section>
        ) : currentResult?.error ? (
          <section role="alert" className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-red-700">{currentResult.error}</p>
            <Link href="/profile" className="mt-4 inline-block text-sm font-bold text-[#1552b5] hover:underline">
              Return to employee directory
            </Link>
          </section>
        ) : employee ? (
          <article className="overflow-hidden rounded-[32px] border border-[#e6edf4] bg-white shadow-sm">
            <header className="flex flex-col gap-5 bg-[#1b64da] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#bfe0f5] text-xl font-black text-[#0b3b76] ring-4 ring-white/30">
                  {employee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">{employee.name}</h1>
                  <p className="mt-1 text-sm font-semibold text-white/85">{employee.emp_code}</p>
                </div>
              </div>
              <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${
                employee.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}>
                {employee.status}
              </span>
            </header>

            <section className="space-y-5 p-5 sm:p-8" aria-labelledby="employee-details-heading">
              <div>
                <h2 id="employee-details-heading" className="text-lg font-black">Profile Details</h2>
                <p className="mt-1 text-sm text-slate-600">Browse this employee’s details by category.</p>
              </div>

              <nav aria-label="Profile categories" className="rounded-3xl border border-[#e6edf4] bg-white p-3 shadow-sm sm:p-4">
                <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {PROFILE_CATEGORIES.map(({ id: categoryId, label, Icon }) => (
                    <button
                      key={categoryId}
                      type="button"
                      onClick={() => setActiveCategory(categoryId)}
                      aria-pressed={activeCategory === categoryId}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                        activeCategory === categoryId
                          ? "bg-[#1b64da] text-white shadow-sm"
                          : "bg-[#f0f6fa] text-[#0f172a] hover:bg-[#bfe0f5]"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="space-y-4">
                {PROFILE_SECTIONS
                  .filter((section) => activeCategory === "all" || section.cat === activeCategory)
                  .map((section) => (
                    <section key={section.id} className="overflow-hidden rounded-[28px] border border-[#e6edf4] bg-white p-5 shadow-sm sm:p-6">
                      <div className="mb-5 flex items-start gap-3 border-b border-[#e6edf4] pb-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf5fd] text-[#1552b5]">
                          {section.icon === "user" ? <UserRound className="h-5 w-5" aria-hidden="true" />
                            : section.icon === "phone" ? <Phone className="h-5 w-5" aria-hidden="true" />
                              : section.icon === "calendar" ? <CalendarDays className="h-5 w-5" aria-hidden="true" />
                                : section.icon === "pin" ? <MapPin className="h-5 w-5" aria-hidden="true" />
                                  : section.icon === "bank" ? <Landmark className="h-5 w-5" aria-hidden="true" />
                                    : section.icon === "family" ? <Users className="h-5 w-5" aria-hidden="true" />
                                      : section.icon === "folder" ? <FolderOpen className="h-5 w-5" aria-hidden="true" />
                                        : section.icon === "briefcase" ? <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                                          : <Camera className="h-5 w-5" aria-hidden="true" />}
                        </span>
                        <div>
                          <h3 className="text-base font-black text-[#0f172a]">{section.title}</h3>
                          <p className="mt-1 text-xs text-slate-600">{section.sub}</p>
                        </div>
                      </div>

                      {section.kind === "kv" ? (
                        <div className="space-y-5">
                          {section.groups.map((group) => (
                            <div key={group.id}>
                              {section.groups.length > 1 && (
                                <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#1b64da]">
                                  <span className="h-2 w-2 rounded-full bg-[#7BBDE8]" />
                                  {group.title}
                                </h4>
                              )}
                              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                {group.fields.map((field) => {
                                  const value = getEmployeeProfileValue(employee, field.key);
                                  return (
                                    <div key={field.key} className="rounded-2xl border border-[#e6edf4] bg-[#f0f6fa] p-4">
                                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{field.label}</dt>
                                      <dd className="mt-1.5 break-words text-sm font-black text-[#0f172a]">
                                        {value || <span className="font-medium text-slate-400">Not provided</span>}
                                      </dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-2xl border border-dashed border-[#7BBDE8] bg-[#f0f6fa] px-4 py-8 text-center text-sm text-slate-600">
                          No {section.title.toLowerCase()} records are available for this employee.
                        </p>
                      )}
                    </section>
                  ))}
              </div>
            </section>
          </article>
        ) : null}
      </div>
    </main>
  );
}