"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import {
  LayoutGrid, Camera, User, Contact, Phone, Calendar, Users, FolderOpen, Briefcase, Landmark,
  MapPin, FileText, Check, X, Pencil, Plus, Clock, ShieldCheck, Lock, AlertCircle, Search,
  ChevronLeft, ChevronRight, Loader2, Eye, type LucideIcon,
} from "lucide-react";
import type { AppDispatch, RootState } from "@/app/store/store";
import { fetchEmployees, type Employee } from "@/app/store/employee/employeeSlice";
import {
  PROFILE_SECTIONS as SECTIONS,
  type FieldDef,
  type KVSection,
  type ListSection,
  type ProfileSection,
} from "./profileSections";

/* =====================================================================
   THEME (same tokens as the Payroll page)
   ===================================================================== */
const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

/* =====================================================================
   TYPES
   ===================================================================== */
type Role = "employee" | "admin";
type Status = "Pending" | "Approved" | "Rejected";
type Row = Record<string, string>;

interface Change { key: string; label: string; from: string; to: string }
interface ChangeRequest {
  id: string; sectionId: string; kind: "update" | "add"; changes: Change[]; row?: Row;
  status: Status; remarks: string; requestedAt: string;
}

const ICONS: Record<string, LucideIcon> = {
  grid: LayoutGrid, camera: Camera, user: User, id: Contact, phone: Phone, calendar: Calendar, family: Users,
  folder: FolderOpen, briefcase: Briefcase, bank: Landmark, pin: MapPin, doc: FileText, check: Check, x: X,
  pencil: Pencil, plus: Plus, clock: Clock, shield: ShieldCheck, lock: Lock, alert: AlertCircle,
};

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid" }, { id: "personal", label: "Personal", icon: "id" },
  { id: "contact", label: "Contact", icon: "phone" }, { id: "dates", label: "Dates", icon: "calendar" },
  { id: "family", label: "Family", icon: "family" }, { id: "docs", label: "Documents", icon: "folder" },
  { id: "details", label: "Bank & Address", icon: "bank" }, { id: "qualification", label: "Experience", icon: "briefcase" },
  { id: "profile", label: "Photo", icon: "camera" },
];

const SEED_VALUES: Record<string, string> = {
  "p.marital": "Unmarried", "p.father": "Nagarajan", "p.religion": "Hindu",
  "c.mobile": "7339270451", "c.email": "jagadesh@enandgate.com", "e.no": "8870288949",
  "d.doj": "17-07-2024", "d.dob": "03-09-1998", "d.bday": "03-09-1998",
  "b.name": "Kotak Mahindra Bank", "b.branch": "Bangalore Manyata Tech", "b.account": "6648033288", "b.ifsc": "KKBK0008137",
};
const SEED_REQUESTS: ChangeRequest[] = [
  { id: "seed1", sectionId: "contact", kind: "update", status: "Pending", remarks: "", requestedAt: "14 Nov 2026, 4:10 pm",
    changes: [{ key: "c.mobile", label: "Mobile No", from: "7339270451", to: "9876543210" }] },
  { id: "seed2", sectionId: "personal", kind: "update", status: "Rejected", remarks: "Please upload a birth certificate as proof.", requestedAt: "10 Nov 2026, 11:25 am",
    changes: [{ key: "p.cityBirth", label: "City of Birth", from: "", to: "Trichy" }] },
];
// Sections not built on this page keep the completion from your current screen
const STATIC_CERT = [
  { id: "qualifications", title: "Qualifications", pct: 0 }, { id: "official", title: "Official Details", pct: 67 },
  { id: "documents", title: "Documents", pct: 0 }, { id: "esipf", title: "ESI-PF Account", pct: 0 },
  { id: "managers", title: "My Managers", pct: 100 }, { id: "subordinates", title: "My Subordinates", pct: 0 },
];

/* =====================================================================
   HELPERS & SMALL COMPONENTS
   ===================================================================== */
const toISO = (d: string) => { const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const toDisplay = (i: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(i); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const nowIST = () => new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);

const INPUT = "w-full rounded-xl border border-[#bfe0f5] bg-[#f0f6fa] px-4 py-2.5 text-sm font-medium text-[#0f172a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 disabled:cursor-not-allowed disabled:opacity-60";
const LABEL = "text-xs font-bold uppercase tracking-wider text-slate-500";

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const C = ICONS[name]; return <C className={className} aria-hidden="true" />;
}

function CountCard({ label, value, note, color, text, muted, icon }: {
  label: string; value: React.ReactNode; note: string; color: string; text: string; muted: string; icon: string;
}) {
  return (
    <div className="relative flex min-h-[150px] flex-col rounded-[32px] p-5 shadow-sm" style={{ backgroundColor: color, color: text }}>
      <p className="max-w-[65%] text-xs font-bold leading-tight">{label}</p>
      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/60">
        <Icon name={icon} />
      </span>
      <p className="mt-auto pt-4 text-[30px] font-black leading-none tracking-tight">{value}</p>
      <p className={`mt-3 text-xs font-bold leading-snug ${muted}`}>{note}</p>
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map = { Pending: "bg-amber-100 text-amber-800", Approved: "bg-emerald-100 text-emerald-800", Rejected: "bg-rose-100 text-rose-700" } as const;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${map[status]}`}>{status}</span>;
}

function Btn({ children, onClick, variant = "primary", type = "button", disabled, className = "" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "sky" | "danger";
  type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  const v = {
    primary: "bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md shadow-[#1b64da]/20",
    sky: "bg-[#7BBDE8] hover:bg-[#6ab0df] text-[#0f172a] shadow-sm",
    ghost: "bg-white border border-[#bfe0f5] text-[#0f172a] hover:bg-[#bfe0f5]/40 shadow-sm",
    danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBDE8] disabled:opacity-50 ${v} ${className}`}>
      {children}
    </button>
  );
}

function Panel({ title, sub, icon, extra, children }: { title: string; sub?: string; icon: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#e6edf4] bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-[#d6e8f7] bg-[#eaf4fc] p-5 sm:flex-row sm:items-center lg:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#bfe0f5] text-[#1b64da]"><Icon name={icon} className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-[#0f172a]">{title}</h2>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
        </div>
        {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
      </div>
      <div className="p-5 lg:p-6">{children}</div>
    </section>
  );
}

function ViewToggle({ value, onChange, pending }: { value: "existing" | "requested"; onChange: (v: "existing" | "requested") => void; pending: number }) {
  const b = "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all";
  return (
    <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-[#bfe0f5]">
      <button type="button" onClick={() => onChange("existing")} className={`${b} ${value === "existing" ? "bg-[#1b64da] text-white" : "text-[#0f172a] hover:bg-[#bfe0f5]/50"}`}>Existing</button>
      <button type="button" onClick={() => onChange("requested")} className={`${b} ${value === "requested" ? "bg-[#1b64da] text-white" : "text-[#0f172a] hover:bg-[#bfe0f5]/50"}`}>
        Requested
        {pending > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7BBDE8] px-1 text-[10px] text-[#0f172a]">{pending}</span>}
      </button>
    </div>
  );
}

function RequestCard({ req, section, role, showSection, onReview }: {
  req: ChangeRequest; section: ProfileSection; role: Role; showSection?: boolean;
  onReview: (id: string, status: "Approved" | "Rejected", remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  return (
    <div className="rounded-3xl border border-[#e6edf4] bg-[#f0f6fa] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {showSection && <p className="text-sm font-black text-[#0f172a]">{section.title}</p>}
          <p className="text-xs text-slate-500">
            {req.kind === "add" ? "New entry" : `${req.changes.length} field change${req.changes.length > 1 ? "s" : ""}`} · {req.requestedAt}
          </p>
        </div>
        <StatusChip status={req.status} />
      </div>

      <div className="mt-3 divide-y divide-[#e6edf4] overflow-hidden rounded-2xl border border-[#e6edf4] bg-white">
        {req.kind === "update"
          ? req.changes.map((c) => (
              <div key={c.key} className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-3 sm:gap-3">
                <span className="font-bold text-[#0f172a]">{c.label}</span>
                <span className="text-slate-400 line-through">{c.from || "-"}</span>
                <span className="font-black text-[#1b64da]">{c.to}</span>
              </div>
            ))
          : (section as ListSection).fields.map((fd) => (
              <div key={fd.key} className="grid grid-cols-[1fr_1.5fr] gap-3 px-4 py-3 text-sm">
                <span className="font-bold text-[#0f172a]">{fd.label}</span>
                <span className="break-words font-black text-[#1b64da]">{req.row?.[fd.key] || "-"}</span>
              </div>
            ))}
      </div>

      {req.status !== "Pending" && req.remarks && <p className="mt-3 text-sm text-slate-600"><b>Admin remarks:</b> {req.remarks}</p>}

      {req.status === "Pending" && role === "admin" && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} aria-label="Remarks" placeholder="Remarks (required to reject)" className={`${INPUT} sm:flex-1`} />
          <div className="flex gap-2">
            <Btn variant="danger" className="flex-1" onClick={() => onReview(req.id, "Rejected", remarks)}><Icon name="x" />Reject</Btn>
            <Btn className="flex-1" onClick={() => onReview(req.id, "Approved", remarks)}><Icon name="check" />Approve</Btn>
          </div>
        </div>
      )}
      {req.status === "Pending" && role === "employee" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#1b64da]"><Icon name="clock" />Waiting for admin approval. These fields are locked until it is reviewed.</p>
      )}
    </div>
  );
}

/* =====================================================================
   PAGE
   ===================================================================== */
export default function EmployeeProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    employees,
    loading: employeesLoading,
    error: employeesError,
    pagination: employeePagination,
  } = useSelector((state: RootState) => state.employees);
  const [role] = useState<Role>("admin");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [values, setValues] = useState<Record<string, string>>(SEED_VALUES);
  const [requests, setRequests] = useState<ChangeRequest[]>(SEED_REQUESTS);
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [certified, setCertified] = useState<Record<string, boolean>>({});
  const [cat, setCat] = useState("all");
  const [tabs, setTabs] = useState<Record<string, "existing" | "requested">>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setEmployeePage(1);
      setDebouncedEmployeeSearch(employeeSearch.trim());
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [employeeSearch]);

  useEffect(() => {
    if (role !== "admin") return;

    void dispatch(fetchEmployees({
      page: employeePage,
      limit: 10,
      search: debouncedEmployeeSearch,
    }));
  }, [dispatch, employeePage, debouncedEmployeeSearch, role]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200); };
  const byId = (id: string) => SECTIONS.find((s) => s.id === id)!;
  const closeModal = () => { setEditing(null); setAdding(null); };

  const pending = requests.filter((r) => r.status === "Pending");
  const rejected = requests.filter((r) => r.status === "Rejected");
  const pendingField = useMemo(() => {
    const m: Record<string, Change> = {};
    requests.filter((r) => r.status === "Pending").forEach((r) => r.changes.forEach((c) => (m[c.key] = c)));
    return m;
  }, [requests]);

  /* ---------- employee actions ---------- */
  const openEdit = (s: KVSection) => {
    const d: Record<string, string> = {};
    s.groups.forEach((g) => g.fields.forEach((fd) => (d[fd.key] = values[fd.key] || "")));
    setDraft(d); setEditing(s.id);
  };
  const openAdd = (s: ListSection) => { setDraft({}); setAdding(s.id); };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = byId(editing!) as KVSection;
    const instant: Record<string, string> = {};
    const needApproval: Change[] = [];
    s.groups.forEach((g) => g.fields.forEach((fd) => {
      if (fd.readOnly || pendingField[fd.key]) return;
      const from = values[fd.key] || "", to = (draft[fd.key] || "").trim();
      if (from === to) return;
      if (fd.approval) needApproval.push({ key: fd.key, label: fd.label, from, to }); else instant[fd.key] = to;
    }));
    const n = Object.keys(instant).length;
    if (!n && !needApproval.length) { closeModal(); return flash("No changes to save."); }
    if (n) setValues((v) => ({ ...v, ...instant }));
    if (needApproval.length) {
      setRequests((r) => [{ id: uid(), sectionId: s.id, kind: "update", changes: needApproval, status: "Pending", remarks: "", requestedAt: nowIST() }, ...r]);
      setTabs((t) => ({ ...t, [s.id]: "requested" }));
    }
    closeModal();
    flash(`${n ? `${n} saved. ` : ""}${needApproval.length ? `${needApproval.length} sent to admin for approval.` : ""}`);
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const s = byId(adding!) as ListSection;
    setRequests((r) => [{ id: uid(), sectionId: s.id, kind: "add", changes: [], row: { ...draft, id: uid() }, status: "Pending", remarks: "", requestedAt: nowIST() }, ...r]);
    setTabs((t) => ({ ...t, [s.id]: "requested" }));
    closeModal(); flash("Sent to admin for approval.");
  };

  /* ---------- admin review ---------- */
  const review = (id: string, status: "Approved" | "Rejected", remarks: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    if (status === "Rejected" && !remarks.trim()) return flash("Add a remark so the employee knows why it was rejected.");
    if (status === "Approved") {
      if (req.kind === "update") setValues((v) => { const n = { ...v }; req.changes.forEach((c) => (n[c.key] = c.to)); return n; });
      else if (req.row) setRows((r) => ({ ...r, [req.sectionId]: [...(r[req.sectionId] || []), { ...req.row!, approvalRemarks: remarks.trim() || "-" }] }));
    }
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status, remarks: remarks.trim() } : r)));
    flash(status === "Approved" ? "Approved and applied to the profile." : "Rejected. The employee will see your remarks.");
  };

  /* ---------- completion ---------- */
  const kvPct = (id: string) => {
    const keys = (byId(id) as KVSection).groups.flatMap((g) => g.fields.map((x) => x.key));
    return Math.round((keys.filter((k) => values[k]).length / keys.length) * 100);
  };
  const listPct = (id: string) => ((rows[id] || []).length ? 100 : 0);
  const computed = [
    { id: "personal", title: "Personal Details", pct: kvPct("personal") },
    { id: "contact", title: "Contact Details", pct: kvPct("contact") },
    { id: "dates", title: "Important Dates", pct: kvPct("dates") },
    { id: "family", title: "Family Details", pct: listPct("family") },
    { id: "nominee", title: "Nominee Details", pct: listPct("nominee") },
    { id: "address", title: "Address Details", pct: kvPct("address") },
    { id: "bank", title: "Bank Details", pct: kvPct("bank") },
    { id: "prior", title: "Prior Work Experience", pct: listPct("prior") },
  ];
  const certItems = [...computed, ...STATIC_CERT];
  const overall = Math.round(computed.reduce((a, c) => a + c.pct, 0) / computed.length);
  const completeCount = computed.filter((c) => c.pct === 100).length;
  const certCount = certItems.filter((c) => certified[c.id]).length;
  const ring = { r: 40, c: 2 * Math.PI * 40 };
  const profileName = "Jagadesh";
  const profileEmail = values["c.email"];
  const profileInitial = profileName.charAt(0).toUpperCase();

  /* ---------- section renderers ---------- */
  const renderKV = (s: KVSection) => {
    const tab = tabs[s.id] || "existing";
    const reqs = requests.filter((r) => r.sectionId === s.id);
    return (
      <Panel key={s.id} title={s.title} sub={s.sub} icon={s.icon} extra={<>
        <ViewToggle value={tab} pending={reqs.filter((r) => r.status === "Pending").length} onChange={(v) => setTabs((t) => ({ ...t, [s.id]: v }))} />
        {role === "employee" && <Btn onClick={() => openEdit(s)}><Icon name="pencil" />Update</Btn>}
      </>}>
        {tab === "existing" ? (
          <div className="space-y-5">
            {s.groups.map((g) => (
              <div key={g.id}>
                {s.groups.length > 1 && (
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#1b64da]">
                    <span className="h-2 w-2 rounded-full bg-[#7BBDE8]" />{g.title}
                  </h3>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {g.fields.map((fd) => {
                    const p = pendingField[fd.key];
                    return (
                      <div key={fd.key} className={`rounded-2xl border p-4 ${p ? "border-[#7BBDE8] bg-[#bfe0f5]/40" : "border-[#e6edf4] bg-[#f0f6fa]"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={LABEL}>{fd.label}</span>
                          {fd.readOnly ? <span title="Managed by HR"><Icon name="lock" className="h-3.5 w-3.5 text-slate-400" /></span>
                            : fd.approval ? <span title="Changes need admin approval"><Icon name="shield" className="h-3.5 w-3.5 text-[#1b64da]" /></span> : null}
                        </div>
                        <p className="mt-1.5 break-words text-sm font-black text-[#0f172a]">{values[fd.key] || <span className="font-medium text-slate-400">Not provided</span>}</p>
                        {p && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#1b64da]"><Icon name="clock" className="h-3 w-3" />Pending: {p.to}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {reqs.length === 0 && <p className="rounded-2xl border border-dashed border-[#7BBDE8] py-8 text-center text-sm text-slate-500">No change requests yet.</p>}
            {reqs.map((r) => <RequestCard key={r.id} req={r} section={s} role={role} onReview={review} />)}
          </div>
        )}
      </Panel>
    );
  };

  const renderList = (s: ListSection) => {
    const tab = tabs[s.id] || "existing";
    const reqs = requests.filter((r) => r.sectionId === s.id);
    const data = rows[s.id] || [];
    const th = "px-3 py-4 whitespace-nowrap";
    return (
      <Panel key={s.id} title={s.title} sub={s.sub} icon={s.icon} extra={<>
        <ViewToggle value={tab} pending={reqs.filter((r) => r.status === "Pending").length} onChange={(v) => setTabs((t) => ({ ...t, [s.id]: v }))} />
        {role === "employee" && <Btn onClick={() => openAdd(s)}><Icon name="plus" />{s.addLabel}</Btn>}
      </>}>
        {tab === "existing" ? (
          data.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#7BBDE8] bg-[#f0f6fa] px-4 py-8 text-center text-sm text-slate-500">
              No records yet.{role === "employee" && ` Use “${s.addLabel}” to send one for approval.`}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#e6edf4]" role="region" aria-label={`${s.title} table`} tabIndex={0}>
              <table className="app-data-table min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-[#bfe0f5] bg-[#f0f6fa] text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                    <th className={th}>#</th>
                    {s.fields.map((x) => <th key={x.key} className={th}>{x.label}</th>)}
                    <th className={th}>Remarks</th><th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6edf4] text-sm">
                  {data.map((row, i) => (
                    <tr key={row.id} className="transition-colors hover:bg-[#bfe0f5]/20">
                      <td className="px-3 py-4 font-mono text-xs text-slate-500">{i + 1}</td>
                      {s.fields.map((x) => <td key={x.key} className="px-3 py-4 font-bold">{row[x.key] || "-"}</td>)}
                      <td className="px-3 py-4 text-slate-600">{row.approvalRemarks}</td>
                      <td className="px-3 py-4"><StatusChip status="Approved" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {reqs.length === 0 && <p className="rounded-2xl border border-dashed border-[#7BBDE8] py-8 text-center text-sm text-slate-500">No requested details yet.</p>}
            {reqs.map((r) => <RequestCard key={r.id} req={r} section={s} role={role} onReview={review} />)}
          </div>
        )}
      </Panel>
    );
  };

  /* ---------- modal ---------- */
  const modal = editing ? (byId(editing) as KVSection) : adding ? (byId(adding) as ListSection) : null;
  const renderInput = (fd: FieldDef, disabled = false) => {
    const val = draft[fd.key] || "";
    const set = (v: string) => setDraft((d) => ({ ...d, [fd.key]: v }));
    if (fd.type === "select")
      return (<select id={fd.key} value={val} disabled={disabled} required={!!adding} onChange={(e) => set(e.target.value)} className={INPUT}>
        <option value="">Select any one</option>{fd.options?.map((o) => <option key={o}>{o}</option>)}</select>);
    if (fd.type === "file")
      return <input id={fd.key} type="file" required onChange={(e) => set(e.target.files?.[0]?.name || "")} className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-[#1b64da] file:px-3 file:py-1 file:text-xs file:font-bold file:text-white`} />;
    if (fd.type === "date")
      return <input id={fd.key} type="date" value={toISO(val)} disabled={disabled} required={!!adding} onChange={(e) => set(toDisplay(e.target.value))} className={INPUT} />;
    return <input id={fd.key} type={fd.type || "text"} value={val} disabled={disabled} required={!!adding} onChange={(e) => set(e.target.value)} className={INPUT} />;
  };
  const FieldTag = ({ fd }: { fd: FieldDef }) => fd.readOnly
    ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">HR managed</span>
    : fd.approval ? <span className="rounded-full bg-[#bfe0f5] px-2 py-0.5 text-[10px] font-bold text-[#1b64da]">Needs approval</span>
    : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Saves instantly</span>;

  const visible = SECTIONS.filter((s) => cat === "all" || s.cat === cat);

  return (
    <div className="min-h-screen bg-[#f0f6fa] font-sans text-[#0f172a] antialiased selection:bg-[#7BBDE8]/30">
      <main className="flex-1 min-w-0 py-4 sm:py-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1880px] space-y-6 px-3 sm:px-5 lg:px-6">

          {/* PAGE HEADER */}
          <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0047BA] via-[#1b64da] to-[#38A9F5] px-5 py-6 text-white shadow-lg shadow-[#1b64da]/15 sm:px-8 sm:py-7">
            <span className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -bottom-28 right-48 h-48 w-48 rounded-full bg-[#7BBDE8]/30" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75">People &amp; teams</p>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Employee Profiles</h1>
                <p className="mt-2 max-w-xl text-sm font-medium text-white/80">
                  Browse the employee directory and open a profile to view their details.
                </p>
              </div>
              <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Contact className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xl font-black leading-none">{employeePagination?.total ?? employees.length}</p>
                  <p className="mt-1 text-xs font-semibold text-white/80">Employees</p>
                </div>
              </div>
            </div>
          </header>

          {role === "admin" && (
            <section aria-label="Employee directory" className="overflow-hidden rounded-[28px] border border-[#d6e8f7] bg-white shadow-sm shadow-[#0f477a]/5">
              <div className="flex flex-col gap-3 border-b border-[#e6edf4] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4fc] text-[#1b64da]">
                    <Contact className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-[#0f172a]">Employee Directory</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Select an employee to view their profile.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label htmlFor="profile-employee-search" className="sr-only">Search employees</label>
                  <div className="flex w-full items-center gap-2 rounded-xl border border-[#c7e1f4] bg-[#f8fcff] px-3.5 py-3 transition focus-within:border-[#1b64da] focus-within:ring-2 focus-within:ring-[#7BBDE8]/40 sm:max-w-md">
                    <Search className="h-4 w-4 shrink-0 text-[#1b64da]" aria-hidden="true" />
                    <input
                      id="profile-employee-search"
                      type="search"
                      value={employeeSearch}
                      onChange={(event) => setEmployeeSearch(event.target.value)}
                      placeholder="Search by name, code, email..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {employees.length} of {employeePagination?.total ?? employees.length} employees
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#d6e8f7] shadow-sm" aria-live="polite">
                  <table className="app-data-table min-w-[1000px] table-fixed text-left">
                    <colgroup>
                      <col className="w-[21%]" />
                      <col className="w-[10%]" />
                      <col className="w-[16%]" />
                      <col className="w-[19%]" />
                      <col className="w-[13%]" />
                      <col className="w-[9%]" />
                      <col className="w-[12%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[#1b64da] bg-[#1b64da] text-xs font-bold uppercase tracking-wider text-white">
                        <th scope="col" className="px-4 py-4">Employee</th>
                        <th scope="col" className="px-4 py-4">Emp Code</th>
                        <th scope="col" className="px-4 py-4">Designation</th>
                        <th scope="col" className="px-4 py-4">Contact</th>
                        <th scope="col" className="px-4 py-4">Joining Date</th>
                        <th scope="col" className="px-4 py-4">Status</th>
                        <th scope="col" className="px-4 py-4 text-center">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6edf4] text-sm">
                      {employeesLoading && employees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-14 text-center text-sm text-slate-500">
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-[#1b64da]" aria-hidden="true" />
                              Loading employees...
                            </span>
                          </td>
                        </tr>
                      ) : employees.length > 0 ? (
                        employees.map((employee: Employee) => (
                          <tr key={employee.id} className="group transition-colors duration-150 hover:bg-[#f0f8fe]">
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-3.5">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b64da] to-[#7BBDE8] text-sm font-black tracking-wider text-white shadow-sm transition-transform group-hover:scale-105">
                                  {employee.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <div className="break-words text-sm font-bold text-[#0f172a] transition-colors group-hover:text-[#1b64da]">{employee.name}</div>
                                  <div className="text-xs font-medium text-slate-500">Employee</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="inline-block max-w-full break-all rounded-lg border border-[#d6e8f7] bg-[#eaf4fc] px-2.5 py-1 font-mono text-xs font-bold text-[#1b64da]">
                                {employee.emp_code}
                              </span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className="inline-block max-w-full break-words rounded-xl border border-[#d6e8f7] bg-[#eaf4fc] px-3 py-1 text-xs font-bold text-[#1b64da]">
                                {employee.designation || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex flex-col space-y-1 text-xs text-slate-600">
                                <span className="break-all font-mono text-slate-700">{employee.email}</span>
                                <span className="break-all font-mono font-bold text-slate-500">{employee.phone || "—"}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 align-middle">
                              <span className="text-xs font-bold text-[#0f172a]">{employee.date_of_joining?.split(/[T ]/)[0] || "—"}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 align-middle">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-sm ${
                                employee.status === "ACTIVE"
                                  ? "border-[#7BBDE8] bg-[#e1f1fb] text-[#0a47b3]"
                                  : "border-slate-200 bg-slate-100 text-slate-700"
                              }`}>
                                <span className={`h-2 w-2 rounded-full ${employee.status === "ACTIVE" ? "bg-[#1b64da]" : "bg-slate-400"}`} />
                                {employee.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                              <div className="flex items-center justify-center gap-1.5">
                                <Link
                                  href={`/profile/${employee.id}`}
                                  title={`View ${employee.name}'s profile`}
                                  aria-label={`View ${employee.name}'s profile`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b64da] text-white shadow-sm shadow-[#1b64da]/20 transition hover:bg-[#1552b5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b64da]"
                                >
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                            {employeesError ? (
                              <span role="alert" className="text-red-700">{employeesError}</span>
                            ) : "No employees found."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {employeesError && employees.length > 0 && (
                  <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{employeesError}</p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-[#e6edf4] pt-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Page {employeePagination?.page ?? employeePage} of {Math.max(employeePagination?.total_pages ?? 1, 1)}
                      {employeePagination ? ` · ${employeePagination.total} employees` : ""}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label="Previous employee page"
                        disabled={employeePage <= 1 || employeesLoading}
                        onClick={() => setEmployeePage((page) => Math.max(1, page - 1))}
                        className="rounded-xl border border-[#c7e1f4] bg-white p-2 text-[#1b64da] transition hover:bg-[#eaf4fc] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next employee page"
                        disabled={employeePage >= (employeePagination?.total_pages ?? 1) || employeesLoading}
                        onClick={() => setEmployeePage((page) => page + 1)}
                        className="rounded-xl border border-[#c7e1f4] bg-white p-2 text-[#1b64da] transition hover:bg-[#eaf4fc] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                </div>
              </div>
            </section>
          )}

          {role === "employee" && (
            <>
          {/* HERO */}
          <header className="relative overflow-hidden rounded-[32px] bg-[#1b64da] p-6 text-white shadow-md shadow-[#1b64da]/20 sm:p-8">
            <span className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7BBDE8]/30" />
            <span className="pointer-events-none absolute -bottom-28 right-40 hidden h-56 w-56 rounded-full bg-[#bfe0f5]/15 md:block" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#bfe0f5] text-3xl font-black text-[#0f172a] ring-4 ring-white/60 sm:h-24 sm:w-24 sm:text-4xl">{profileInitial}</div>
                  {role === "employee" && (
                    <button type="button" aria-label="Upload profile photo" onClick={() => openAdd(byId("profileImage") as ListSection)}
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1b64da] shadow-md transition hover:bg-[#bfe0f5]">
                      <Icon name="camera" />
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{profileName}</h2>
                  <p className="mt-1 break-all text-sm font-medium text-white/80">{profileEmail || "No email provided"}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-white/15 px-3 py-1">Joined {values["d.doj"]}</span>
                    <span className="rounded-full bg-[#bfe0f5] px-3 py-1 text-[#0f172a]">Active · Permanent</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-start rounded-3xl bg-white/15 p-4 md:self-auto">
                <div className="relative h-20 w-20 shrink-0" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overall} aria-label="Profile completion">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r={ring.r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
                    <circle cx="50" cy="50" r={ring.r} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={ring.c} strokeDashoffset={ring.c * (1 - overall / 100)} style={{ transition: "stroke-dashoffset 900ms ease" }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-black">{overall}%</span>
                </div>
                <div>
                  <p className="text-sm font-black">Profile completion</p>
                  <p className="mt-0.5 text-xs font-medium text-white/80">{completeCount} of {computed.length} sections complete</p>
                </div>
              </div>
            </div>
          </header>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CountCard label="Profile Completion" value={`${overall}%`} note={`${completeCount} of ${computed.length} sections complete`} color={SKY} text={INK} muted="text-black/50" icon="user" />
            <CountCard label="Pending Approvals" value={pending.length} note="Waiting for admin review" color={SKY_LIGHT} text={INK} muted="text-black/50" icon="clock" />
            <CountCard label="Self-Certified" value={`${certCount}/${certItems.length}`} note="Sections you have certified" color={BLUE} text="#ffffff" muted="text-white/70" icon="shield" />
            <CountCard label="Needs Attention" value={rejected.length} note="Rejected requests to review" color={SKY} text={INK} muted="text-black/50" icon="alert" />
          </div>

          {/* CATEGORY SELECTOR */}
          <nav aria-label="Profile categories" className="rounded-[32px] border border-[#e6edf4] bg-white p-4 shadow-sm">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${cat === c.id ? "bg-[#1b64da] text-white shadow-sm" : "bg-[#f0f6fa] text-[#0f172a] hover:bg-[#bfe0f5]"}`}>
                  <Icon name={c.icon} />{c.label}
                </button>
              ))}
            </div>
          </nav>

          {/* CONTENT + SIDEBAR */}
          <div className="flex min-w-0 flex-col items-start gap-4 xl:flex-row">
            <div className="w-full min-w-0 flex-1 space-y-4">
              {visible.map((s) => (s.kind === "kv" ? renderKV(s) : renderList(s)))}
            </div>

            <aside className="w-full shrink-0 space-y-4 xl:sticky xl:top-4 xl:w-[340px]">
              {/* Self certification */}
              <section className="overflow-hidden rounded-3xl border border-[#d6e8f7] bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#d6e8f7] bg-[#f1f8fe] px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b64da] text-white"><Icon name="shield" className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-sm font-black">Self certification</h2>
                    <p className="text-xs font-medium text-slate-600">{certCount} of {certItems.length} certified</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="h-2 overflow-hidden rounded-full bg-[#e6edf4]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((certCount / certItems.length) * 100)}>
                    <div className="h-full rounded-full bg-[#1b64da] transition-all duration-700" style={{ width: `${(certCount / certItems.length) * 100}%` }} />
                  </div>
                  <ul className="mt-2 divide-y divide-[#e6edf4]">
                    {certItems.map((c) => {
                      const ok = !!certified[c.id];
                      const can = c.pct === 100 && role === "employee";
                      return (
                        <li key={c.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-bold">{c.title}</span>
                              <span className="text-xs font-black text-[#1b64da]">{c.pct}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e6edf4]">
                              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.pct === 100 ? BLUE : SKY }} />
                            </div>
                          </div>
                          <button type="button" role="switch" aria-checked={ok} aria-label={`Certify ${c.title}`} disabled={!can}
                            title={c.pct < 100 ? "Complete this section to certify it" : undefined}
                            onClick={() => setCertified((m) => ({ ...m, [c.id]: !m[c.id] }))}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ok ? "bg-[#1b64da]" : "bg-slate-200"}`}>
                            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ok ? "translate-x-5" : ""}`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">A section can be certified once it is 100% complete.</p>
                </div>
              </section>

              {/* Recent requests + legend */}
              <section className="overflow-hidden rounded-3xl border border-[#d6e8f7] bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#d6e8f7] bg-[#f1f8fe] px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7BBDE8] text-[#0f172a]"><Icon name="clock" className="h-5 w-5" /></span>
                  <h2 className="text-sm font-black">Recent requests</h2>
                </div>
                <div className="p-4">
                  {requests.length === 0 ? <p className="text-xs text-slate-500">No requests yet.</p> : (
                    <ul className="space-y-3">
                      {requests.slice(0, 4).map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{byId(r.sectionId).title}</p>
                            <p className="text-[11px] text-slate-500">{r.requestedAt}</p>
                          </div>
                          <StatusChip status={r.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 space-y-2 rounded-2xl bg-[#f0f6fa] p-3 text-xs text-slate-600">
                    <p className="flex items-center gap-2"><Icon name="shield" className="text-[#1b64da]" />Changes need admin approval</p>
                    <p className="flex items-center gap-2"><Icon name="lock" className="text-slate-400" />Managed by HR, read-only</p>
                    <p className="flex items-center gap-2"><Icon name="check" className="text-emerald-600" />Everything else saves instantly</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL */}
      {role === "employee" && modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={closeModal}>
          <form onSubmit={editing ? submitEdit : submitAdd} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={modal.title}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] border border-[#bfe0f5] bg-white shadow-2xl sm:rounded-[32px]">
            <div className="m-4 flex items-center justify-between gap-3 rounded-2xl border border-[#d6e8f7] bg-[#eaf4fc] p-4 sm:m-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#bfe0f5] text-[#1b64da]"><Icon name={editing ? "pencil" : "plus"} className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-lg font-black">{editing ? `Update ${modal.title}` : (modal as ListSection).addLabel}</h3>
                  <p className="text-xs text-slate-500">{modal.title}</p>
                </div>
              </div>
              <button type="button" aria-label="Close" onClick={closeModal} className="rounded-full p-2 text-slate-400 hover:bg-[#bfe0f5]/50 hover:text-[#1b64da]"><Icon name="x" className="h-5 w-5" /></button>
            </div>

            <div className="space-y-6 overflow-y-auto px-4 pb-2 sm:px-5">
              {editing ? (modal as KVSection).groups.map((g) => (
                <div key={g.id}>
                  {(modal as KVSection).groups.length > 1 && <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-[#1b64da]">{g.title}</h4>}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {g.fields.map((fd) => (
                      <div key={fd.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <label htmlFor={fd.key} className={LABEL}>{fd.label}</label>
                          {pendingField[fd.key] ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Awaiting approval</span> : <FieldTag fd={fd} />}
                        </div>
                        {renderInput(fd, !!fd.readOnly || !!pendingField[fd.key])}
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(modal as ListSection).fields.map((fd) => (
                    <div key={fd.key}>
                      <label htmlFor={fd.key} className={`mb-1.5 block ${LABEL}`}>{fd.label}</label>
                      {renderInput(fd)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-col-reverse gap-3 border-t border-[#e6edf4] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="rounded-2xl bg-[#bfe0f5]/50 px-3 py-2 text-xs text-[#0f172a]">
                {adding ? "This entry is added after admin approval." : "Fields marked “Needs approval” stay unchanged until approved. The rest save instantly."}
              </p>
              <div className="flex items-center justify-end gap-3">
                <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
                <Btn type="submit">{adding ? "Submit for approval" : "Save changes"}</Btn>
              </div>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl" style={{ backgroundColor: INK }}>{toast}</div>
      )}
    </div>
  );
}