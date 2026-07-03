"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Plus, X, Loader2, Trash2, Search,
  CheckCircle2, XCircle, Info, AlertTriangle,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Allocation {
  id: string; leave_type: string; year: number;
  total_days: number; used_days: number; remaining: number;
}
interface LeaveRecord {
  id: string; leave_type: string; start_date: string; end_date: string;
  days_taken: number; status: string; notes: string | null;
  approved_by: string | null; created_at: string;
}
interface EmployeeLeaveData {
  employee_id: string; employee_name: string; employment_type: string;
  annual_entitlement: number; year: number;
  allocations: Allocation[]; records: LeaveRecord[];
}

// ── Leave type config ──────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: "annual",        label: "Annual Leave",       color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",       fixed: null,  desc: "Permanent: 21d · Temporary: 18d · MD: 28d" },
  { value: "sick",          label: "Sick Leave",          color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",     fixed: null,  desc: "Based on recovery — admin sets duration" },
  { value: "maternity",     label: "Maternity Leave",     color: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",         fixed: 90,    desc: "Fixed: 90 days (3 months)" },
  { value: "paternity",     label: "Paternity Leave",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",         fixed: 14,    desc: "Fixed: 14 days (2 weeks)" },
  { value: "compassionate", label: "Compassionate Leave", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300", fixed: null,  desc: "Arranged by HR — admin sets duration" },
];
const leaveLabel = (t: string) => LEAVE_TYPES.find(l => l.value === t)?.label ?? t;
const leaveColor = (t: string) => LEAVE_TYPES.find(l => l.value === t)?.color ?? "bg-slate-100 text-slate-600";
const fmtDate    = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Month selector component ───────────────────────────────────────────────────
function MonthSelector({ month, onChange }: { month: number | null; onChange: (m: number | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
          month === null
            ? "bg-cyan-500 text-white"
            : "border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-cyan-300 hover:text-cyan-600"
        )}>
        All
      </button>
      {MONTHS.map((m, i) => (
        <button key={m}
          onClick={() => onChange(i + 1)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
            month === i + 1
              ? "bg-cyan-500 text-white"
              : "border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-cyan-300 hover:text-cyan-600"
          )}>
          {m.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}
function LeaveBar({ used, total }: { used: number; total: number }) {
  const pct  = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const warn = pct >= 80;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{used} used / {total} total</span>
        <span className={warn ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn("h-full rounded-full transition-all", warn ? "bg-amber-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{Math.max(0, total - used)} days remaining</p>
    </div>
  );
}

// ── Grant Leave Form ───────────────────────────────────────────────────────────
function GrantLeaveForm({ employeeId, employeeName, annualEntitlement, allocations, onSuccess, onClose }: {
  employeeId: string; employeeName: string;
  annualEntitlement: number; allocations: Allocation[];
  onSuccess: () => void; onClose: () => void;
}) {
  const [lt, setLt]           = useState("annual");
  const [start, setStart]     = useState("");
  const [end, setEnd]         = useState("");
  const [days, setDays]       = useState<number | "">("");
  const [notes, setNotes]     = useState("");
  const [override, setOverride] = useState<number | "">("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const toast = useToast();

  const annualAlloc     = allocations.find(a => a.leave_type === "annual");
  const annualRemaining = annualAlloc ? annualAlloc.remaining : annualEntitlement;
  const ltMeta          = LEAVE_TYPES.find(t => t.value === lt)!;
  const needsOverride   = ["sick", "compassionate"].includes(lt);

  // Auto-set end date for fixed leave types when start date changes
  useEffect(() => {
    if (!start) return;
    if (lt === "maternity") {
      const e = new Date(start);
      e.setDate(e.getDate() + 89); // 90 days inclusive
      setEnd(e.toISOString().slice(0, 10));
    } else if (lt === "paternity") {
      const e = new Date(start);
      e.setDate(e.getDate() + 13); // 14 days inclusive
      setEnd(e.toISOString().slice(0, 10));
    }
  }, [start, lt]);

  // Auto-calculate WORKING days (Mon-Fri) from date range
  useEffect(() => {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      if (e >= s) {
        let count = 0;
        const cur = new Date(s);
        while (cur <= e) {
          const dow = cur.getDay(); // 0=Sun, 6=Sat
          if (dow !== 0 && dow !== 6) count++;
          cur.setDate(cur.getDate() + 1);
        }
        setDays(count);
      }
    }
  }, [start, end]);

  // Fixed days for maternity/paternity
  useEffect(() => {
    if (ltMeta.fixed !== null) setDays(ltMeta.fixed);
    else if (!["sick","compassionate","annual"].includes(lt)) setDays("");
  }, [lt]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end || !days) { setError("Please fill all required fields."); return; }
    setSaving(true); setError("");
    try {
      await apiClient.leave.grantLeave(employeeId, {
        leave_type:     lt,
        start_date:     new Date(start).toISOString(),
        end_date:       new Date(end).toISOString(),
        notes:          notes.trim() || undefined,
        override_total: needsOverride && override ? Number(override) : undefined,
      });
      toast.success("Leave granted", `${leaveLabel(lt)} for ${employeeName} recorded.`);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to grant leave");
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Leave type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Leave Type <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEAVE_TYPES.map(t => (
            <label key={t.value} className={cn(
              "flex flex-col rounded-xl border-2 px-3 py-2.5 cursor-pointer transition-all",
              lt === t.value ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30"
                             : "border-slate-200 dark:border-slate-700 hover:border-slate-300")}>
              <input type="radio" name="lt" value={t.value} checked={lt === t.value}
                onChange={() => setLt(t.value)} className="sr-only" />
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold self-start mb-1", t.color)}>{t.label}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Contextual info banners */}
      {lt === "annual" && (
        <div className={cn("rounded-xl border px-4 py-3 text-sm",
          annualRemaining <= 0
            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 text-red-700 dark:text-red-300"
            : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300")}>
          <p className="font-semibold">{annualRemaining} annual day{annualRemaining !== 1 ? "s" : ""} remaining</p>
          <p className="text-xs opacity-70 mt-0.5">Entitlement: {annualEntitlement} days/year · Weekends excluded from count</p>
        </div>
      )}
      {lt === "maternity" && (
        <div className="flex items-start gap-2 rounded-xl border border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/30 px-4 py-3 text-sm text-pink-700 dark:text-pink-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Maternity Leave — 3 months (90 calendar days)</p>
            <p className="text-xs opacity-80 mt-0.5">Set the start date — end date auto-calculates 90 days forward. Days are fixed by policy.</p>
          </div>
        </div>
      )}
      {lt === "paternity" && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Paternity Leave — 2 weeks (14 calendar days)</p>
            <p className="text-xs opacity-80 mt-0.5">Set the start date — end date auto-calculates 14 days forward. Days are fixed by policy.</p>
          </div>
        </div>
      )}
      {lt === "sick" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sick Leave — duration based on recovery</p>
            <p className="text-xs opacity-80 mt-0.5">Set the expected recovery period. You can update later if the employee needs more time. Working days (Mon–Fri) are counted.</p>
          </div>
        </div>
      )}
      {lt === "compassionate" && (
        <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 px-4 py-3 text-sm text-violet-700 dark:text-violet-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Compassionate Leave — arranged by HR</p>
            <p className="text-xs opacity-80 mt-0.5">Granted at HR’s discretion for bereavement, family emergencies or personal hardship. Set the duration and add a note for records.</p>
          </div>
        </div>
      )}

      {/* Override for sick/compassionate */}
      {needsOverride && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Total days allocated for this leave
            <span className="ml-1 text-xs text-slate-400">(admin sets per case)</span>
          </label>
          <input type="number" min={1} value={override}
            onChange={e => setOverride(e.target.value ? Number(e.target.value) : "")}
            className="field" placeholder={lt === "sick" ? "e.g. 14 for two-week recovery" : "e.g. 5"} />
        </div>
      )}

      {/* Dates */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            End Date <span className="text-red-500">*</span>
          </label>
          <input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className="field" required />
        </div>
      </div>

      {/* Days taken */}
      <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Days Taken <span className="text-red-500">*</span>
          <span className="ml-1 text-xs text-slate-400">(working days only — weekends excluded)</span>
        </label>
        <input type="number" min={1} value={days}
          onChange={e => setDays(e.target.value ? Number(e.target.value) : "")}
          className="field" placeholder="Number of working days" required />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes / Reason</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          className="field min-h-16" placeholder="Optional — medical reason, event, etc." />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving || !start || !end || !days}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Grant Leave
        </button>
      </div>
    </form>
  );
}

// ── Employee Leave Modal ───────────────────────────────────────────────────────
export function EmployeeLeaveModal({ employeeId, employeeName, onClose }: {
  employeeId: string; employeeName: string; onClose: () => void;
}) {
  const [data, setData]             = useState<EmployeeLeaveData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [year, setYear]             = useState(new Date().getFullYear());
  const [month, setMonth]           = useState<number | null>(null);
  const [showGrant, setShowGrant]   = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiClient.leave.getEmployeeLeave(employeeId, year, month ?? undefined)); }
    catch (e: any) { toast.error("Load failed", e?.message); }
    finally { setLoading(false); }
  }, [employeeId, year, month]);

  useEffect(() => { void load(); }, [load]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiClient.leave.cancelLeave(cancelTarget.id);
      toast.success("Cancelled", "Days restored to leave balance.");
      setCancelTarget(null);
      await load();
    } catch (e: any) { toast.error("Failed", e?.message); }
    finally { setCancelling(false); }
  };

  const initials = employeeName.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}>
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{employeeName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Leave Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
              {Array.from({ length: 2059 - 2014 + 1 }, (_, i) => 2014 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Month filter strip */}
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-2.5 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <MonthSelector month={month} onChange={setMonth} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : data ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Annual entitlement", value: `${data.annual_entitlement} days` },
                  { label: "Contract type",       value: data.employment_type ?? "—" },
                  { label: `Entries ${year}`,     value: data.records.filter(r => r.status === "approved").length },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-3">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 capitalize">{c.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Allocations */}
              {data.allocations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Leave Balances — {year}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.allocations.map(a => (
                      <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 space-y-2">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", leaveColor(a.leave_type))}>
                          {leaveLabel(a.leave_type)}
                        </span>
                        <LeaveBar used={a.used_days} total={a.total_days} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grant leave */}
              {showGrant ? (
                <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Grant Leave
                  </h3>
                  <GrantLeaveForm
                    employeeId={employeeId} employeeName={employeeName}
                    annualEntitlement={data.annual_entitlement} allocations={data.allocations}
                    onSuccess={() => { setShowGrant(false); void load(); }}
                    onClose={() => setShowGrant(false)}
                  />
                </div>
              ) : (
                <button onClick={() => setShowGrant(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-300 dark:border-cyan-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors">
                  <Plus className="h-4 w-4" /> Grant Leave
                </button>
              )}

              {/* History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Leave History {month ? `— ${MONTHS[month-1]} ${year}` : `— All of ${year}`}
                </h3>
                {data.records.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 py-8 text-center text-sm text-slate-400">
                    No leave records yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.records.map(rec => (
                      <div key={rec.id} className={cn(
                        "flex items-start justify-between rounded-xl border px-4 py-3 transition-colors",
                        rec.status === "cancelled"
                          ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 opacity-60"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50")}>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", leaveColor(rec.leave_type))}>
                              {leaveLabel(rec.leave_type)}
                            </span>
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              rec.status === "approved"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                              {rec.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {rec.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {fmtDate(rec.start_date)} → {fmtDate(rec.end_date)}
                            <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.days_taken} days</span>
                          </p>
                          {rec.notes && <p className="text-xs text-slate-400 italic">{rec.notes}</p>}
                          {rec.approved_by && <p className="text-[10px] text-slate-400">Approved by {rec.approved_by}</p>}
                        </div>
                        {rec.status === "approved" && (
                          <button onClick={() => setCancelTarget(rec)}
                            className="ml-3 shrink-0 rounded-lg border border-red-200 dark:border-red-800 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Cancel this leave">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <DeleteModal
        open={!!cancelTarget} title="Cancel Leave"
        description="The days will be restored to the employee's leave balance."
        itemName={cancelTarget ? `${leaveLabel(cancelTarget.leave_type)} (${cancelTarget.days_taken} days)` : ""}
        loading={cancelling} onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
    </div>
  );
}

// ── Main Leave Dashboard ───────────────────────────────────────────────────────
export default function LeaveManagement() {
  const [summary, setSummary]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [year, setYear]         = useState(new Date().getFullYear());
  const [month, setMonth]       = useState<number | null>(new Date().getMonth() + 1);
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");  // filters by leave start date
  const [dateTo, setDateTo]     = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setSummary(await apiClient.leave.getSummary(year, month ?? undefined)); }
    catch (e: any) { toast.error("Load failed", e?.message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);

  const employees = (summary?.employees ?? []).filter((e: any) => {
    if (search.trim() && !e.employee_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom || dateTo) {
      const hasRecordInRange = (e.records ?? []).some((r: any) => {
        const d = (r.start_date || "").slice(0, 10);
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo   && d > dateTo)   return false;
        return true;
      });
      if (!hasRecordInRange) return false;
    }
    return true;
  });

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leave Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {month ? `${MONTHS[month-1]} ${year}` : `Full Year ${year}`} — Admin-managed leave tracking
          </p>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {Array.from({ length: 2059 - 2014 + 1 }, (_, i) => 2014 + i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Month selector */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filter by Month</p>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {/* Monthly KPI strip */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: month ? `Days taken in ${MONTHS[month-1]}` : "Total days taken (year)",
              value: summary.total_days ?? 0,
              accent: "bg-cyan-500",
              sub: month ? `Across all employees in ${MONTHS[month-1]}` : "All leave types combined",
            },
            {
              label: "Currently on leave",
              value: summary.on_leave_now ?? 0,
              accent: "bg-amber-500",
              sub: "Active leave records today",
            },
            {
              label: "Total employees",
              value: summary.employees?.length ?? 0,
              accent: "bg-emerald-500",
              sub: "Active staff tracked",
            },
            {
              label: `Leave records${month ? ` in ${MONTHS[month-1]}` : ""}`,
              value: (summary.employees ?? []).reduce((s: number, e: any) =>
                s + (e.records?.filter((r: any) => r.status === "approved").length ?? 0), 0),
              accent: "bg-violet-500",
              sub: "Approved leave entries",
            },
          ].map(k => (
            <div key={k.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`h-1 w-full ${k.accent}`} />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-snug">{k.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{k.value}</p>
                <p className="mt-1 text-xs text-slate-400">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy legend */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Annual Leave Policy</p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Permanent: 21 days</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Temporary: 18 days</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Managing Director: 28 days</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Intern: 0 days</span>
          <span className="text-slate-400">|</span>
          <span>Maternity: 90 days · Paternity: 14 days · Sick/Compassionate: admin-defined</span>
        </div>
      </div>

      {/* Leave type badges */}
      <div className="flex flex-wrap gap-2">
        {LEAVE_TYPES.map(t => (
          <span key={t.value} className={cn("rounded-full px-3 py-1 text-xs font-semibold", t.color)}>{t.label}</span>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…" className="field pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Leave taken from</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field w-40" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Leave taken to</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="field w-40" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <X className="h-3 w-3" /> Clear dates
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {employees.length} employee{employees.length !== 1 ? "s" : ""}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : employees.length === 0 ? (
          <div className="py-14 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No active employees found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  {["Employee","Contract","Annual Leave",month ? `Days in ${MONTHS[month-1]}` : "Other Leaves","Action"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp: any) => {
                  const annualAlloc = emp.allocations.find((a: Allocation) => a.leave_type === "annual");
                  const otherAllocs = emp.allocations.filter((a: Allocation) => a.leave_type !== "annual");
                  const used  = annualAlloc?.used_days  ?? 0;
                  const total = annualAlloc?.total_days ?? emp.annual_entitlement;
                  return (
                    <tr key={emp.employee_id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
                            {emp.employee_name.split(" ").slice(0,2).map((w: string) => w[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{emp.employee_name}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          emp.employment_type === "permanent"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300")}>
                          {emp.employment_type ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 min-w-[180px]">
                        {emp.annual_entitlement === 0
                          ? <span className="text-xs text-slate-400 italic">Not entitled (Intern)</span>
                          : <LeaveBar used={used} total={total} />}
                      </td>
                      <td className="px-5 py-3">
                        {month ? (
                          <div className="flex items-center gap-2">
                            {emp.period_days_taken > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 px-2.5 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                                <CalendarDays className="h-3 w-3" /> {emp.period_days_taken} day{emp.period_days_taken !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">No leave</span>
                            )}
                            {(emp.records ?? []).filter((r: LeaveRecord) => r.status === "approved").map((r: LeaveRecord) => (
                              <span key={r.id} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", leaveColor(r.leave_type))}>
                                {leaveLabel(r.leave_type)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {otherAllocs.length === 0
                              ? <span className="text-xs text-slate-400">—</span>
                              : otherAllocs.map((a: Allocation) => (
                                <span key={a.id} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", leaveColor(a.leave_type))}>
                                  {leaveLabel(a.leave_type)}: {a.used_days}/{a.total_days}d
                                </span>
                              ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelected({ id: emp.employee_id, name: emp.employee_name })}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-300 transition-colors">
                          <CalendarDays className="h-3 w-3" /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <EmployeeLeaveModal
          employeeId={selected.id} employeeName={selected.name}
          onClose={() => { setSelected(null); void load(); }} />
      )}
    </section>
  );
}
