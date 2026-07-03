"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LogOut, Plus, X, Loader2, Search, AlertTriangle,
  CheckCircle2, Undo2, Pencil, UserMinus, Filter,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

// ── Config ─────────────────────────────────────────────────────────────────────
const EXIT_REASONS = [
  { value: "resignation",     label: "Resignation",      desc: "Employee voluntarily resigned",         color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  { value: "termination",     label: "Termination",      desc: "Employment terminated by the bank",     color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
  { value: "end_of_contract", label: "End of Contract",  desc: "Temporary contract reached its end",    color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
];

const EXIT_TYPES = [
  { value: "regrettable",     label: "Regrettable",      desc: "Bank wished to retain this employee",   color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800" },
  { value: "non_regrettable", label: "Non-Regrettable",  desc: "Bank accepts the departure",            color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
];

function reasonMeta(v: string) { return EXIT_REASONS.find(r => r.value === v); }
function typeMeta(v: string)   { return EXIT_TYPES.find(t => t.value === v); }

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Exit Form Modal ────────────────────────────────────────────────────────────
export function ExitFormModal({ employee, existingExit, onSuccess, onClose }: {
  employee: { id: string; full_name: string; employment_type?: string; position_title?: string };
  existingExit?: any;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [exitDate,   setExitDate]   = useState(existingExit?.exit_date?.slice(0,10) ?? new Date().toISOString().slice(0,10));
  const [reason,     setReason]     = useState(existingExit?.exit_reason ?? "");
  const [type,       setType]       = useState(existingExit?.exit_type ?? "");
  const [nextMove,   setNextMove]   = useState(existingExit?.next_move ?? "");
  const [comments,   setComments]   = useState(existingExit?.comments ?? "");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const toast = useToast();

  const isEdit = !!existingExit;

  const submit = async () => {
    if (!exitDate || !reason || !type) {
      setError("Please fill in Exit Date, Reason and Type.");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        exit_date:   new Date(exitDate).toISOString(),
        exit_reason: reason,
        exit_type:   type,
        next_move:   nextMove.trim() || undefined,
        comments:    comments.trim() || undefined,
      };
      if (isEdit) {
        await apiClient.exits.update(employee.id, payload);
        toast.success("Updated", "Exit record updated.");
      } else {
        await apiClient.exits.process(employee.id, payload);
        toast.success("Exit processed", `${employee.full_name} has been exited. Position is now vacant.`);
      }
      onSuccess();
    } catch (e: any) { setError(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const initials = employee.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}>
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4 shrink-0 border-b",
          isEdit ? "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                 : "border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white",
              isEdit ? "bg-gradient-to-br from-slate-400 to-slate-600" : "bg-gradient-to-br from-red-400 to-rose-600")}>
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? "Edit Exit Record" : "Process Employee Exit"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {employee.full_name}
                {employee.position_title && <span className="ml-1">· {employee.position_title}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning banner for new exits */}
        {!isEdit && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">This action will:</p>
              <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside">
                <li>Set employee status to <strong>Inactive</strong></li>
                <li>End their current position assignment</li>
                <li>Mark their position as <strong>Vacant</strong></li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Exit date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Exit Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}
              className="field" max={new Date().toISOString().slice(0,10)} />
          </div>

          {/* Exit reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Reason for Exit <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {EXIT_REASONS.map(r => (
                <label key={r.value} className={cn(
                  "flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all",
                  reason === r.value ? `${r.color} border-current` : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                )}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                    onChange={() => setReason(r.value)} className="mt-0.5 accent-current" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{r.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Exit type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type of Exit <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EXIT_TYPES.map(t => (
                <label key={t.value} className={cn(
                  "flex flex-col rounded-xl border-2 px-4 py-3 cursor-pointer transition-all",
                  type === t.value ? `${t.color} border-current` : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                )}>
                  <input type="radio" name="type" value={t.value} checked={type === t.value}
                    onChange={() => setType(t.value)} className="sr-only" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Next move — optional */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Next Move <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <input value={nextMove} onChange={e => setNextMove(e.target.value)}
              className="field" placeholder="e.g. Joined BK Group, Furthering studies, Unknown…" />
          </div>

          {/* Comments — optional */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Comments <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <textarea value={comments} onChange={e => setComments(e.target.value)}
              className="field min-h-20"
              placeholder="Additional context, interview notes, circumstances…" />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !exitDate || !reason || !type}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors",
              isEdit ? "bg-cyan-500 hover:bg-cyan-600" : "bg-red-500 hover:bg-red-600"
            )}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Update Record" : "Confirm Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exit Detail Card (inline on employee list) ─────────────────────────────────
export function ExitBadge({ exitData }: { exitData: any }) {
  if (!exitData) return null;
  const r = reasonMeta(exitData.exit_reason);
  const t = typeMeta(exitData.exit_type);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {r && <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", r.color)}>{r.label}</span>}
      {t && <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", t.color)}>{t.label}</span>}
      <span className="text-[10px] text-slate-400">{fmtDate(exitData.exit_date)}</span>
    </div>
  );
}

// ── Main Exit Dashboard ────────────────────────────────────────────────────────
export default function ExitManagement() {
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const debouncedSearch             = useDebouncedValue(search, 250);
  const [dateFrom,   setDateFrom]   = useState("");  // filters by exit date
  const [dateTo,     setDateTo]     = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(25);
  const [undoTarget, setUndoTarget] = useState<any>(null);
  const [undoing,    setUndoing]    = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Unscoped by year — the date range filter below narrows precisely by
      // exit_date on the client, so we always fetch the full history.
      setData(await apiClient.exits.list({
        exit_reason: filterReason || undefined,
        exit_type:   filterType   || undefined,
      }));
    } catch (e: any) { toast.error("Load failed", e?.message); }
    finally { setLoading(false); }
  }, [filterReason, filterType]);

  useEffect(() => { void load(); }, [load]);

  const exits: any[] = useMemo(() =>
    (data?.exits ?? []).filter((e: any) => {
      if (debouncedSearch.trim() && !e.employee_name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (dateFrom || dateTo) {
        const d = (e.exit_date || "").slice(0, 10);
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo   && d > dateTo)   return false;
      }
      return true;
    }), [data, debouncedSearch, dateFrom, dateTo]);

  // Reset to page 1 whenever the filtered set changes shape
  useEffect(() => { setPage(1); }, [debouncedSearch, dateFrom, dateTo, filterReason, filterType]);

  const paginatedExits = useMemo(
    () => exits.slice((page - 1) * pageSize, page * pageSize),
    [exits, page, pageSize]
  );

  // Stats recomputed from the filtered exits (not `data.total` etc, which
  // reflect the full unscoped fetch) so the KPI cards track the date filter.
  const stats = useMemo(() => {
    const by_reason: Record<string, number> = {};
    const by_type:   Record<string, number> = {};
    exits.forEach((e: any) => {
      if (e.exit_reason) by_reason[e.exit_reason] = (by_reason[e.exit_reason] ?? 0) + 1;
      if (e.exit_type)   by_type[e.exit_type]     = (by_type[e.exit_type]     ?? 0) + 1;
    });
    return { total: exits.length, by_reason, by_type };
  }, [exits]);

  const confirmUndo = async () => {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      await apiClient.exits.undo(undoTarget.employee_id);
      toast.success("Exit undone", `${undoTarget.employee_name} restored to Active.`);
      setUndoTarget(null);
      await load();
    } catch (e: any) { toast.error("Failed", e?.message); }
    finally { setUndoing(false); }
  };

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Employee Exits</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track and manage employee departures from NCBA Rwanda
          </p>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total Exits",     value: stats.total,                              color: "bg-slate-100 dark:bg-slate-800",              text: "text-slate-700 dark:text-slate-300" },
            { label: "Resignations",    value: stats.by_reason?.resignation ?? 0,        color: "bg-amber-50 dark:bg-amber-950/30",             text: "text-amber-700 dark:text-amber-300" },
            { label: "Terminations",    value: stats.by_reason?.termination ?? 0,        color: "bg-red-50 dark:bg-red-950/30",                text: "text-red-700 dark:text-red-300" },
            { label: "End of Contract", value: stats.by_reason?.end_of_contract ?? 0,   color: "bg-slate-50 dark:bg-slate-800/50",             text: "text-slate-600 dark:text-slate-400" },
            { label: "Regrettable",     value: stats.by_type?.regrettable ?? 0,          color: "bg-rose-50 dark:bg-rose-950/30",               text: "text-rose-700 dark:text-rose-300" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3", s.color)}>
              <p className={cn("text-xl font-bold", s.text)}>{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…" className="field pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Exited from</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field w-40" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Exited to</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="field w-40" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <X className="h-3 w-3" /> Clear dates
          </button>
        )}
        <select value={filterReason} onChange={e => setFilterReason(e.target.value)} className="field w-44">
          <option value="">All reasons</option>
          {EXIT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="field w-44">
          <option value="">All types</option>
          {EXIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {exits.length} exit record{exits.length !== 1 ? "s" : ""}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : exits.length === 0 ? (
          <div className="py-14 text-center">
            <UserMinus className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No exit records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  {["Employee","Exit Date","Department","Position Held","Reason","Type","Next Move","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedExits.map((ex: any) => {
                  const r = reasonMeta(ex.exit_reason);
                  const t = typeMeta(ex.exit_type);
                  return (
                    <tr key={ex.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-xs font-bold text-white">
                            {ex.employee_name.split(" ").slice(0,2).map((w: string) => w[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{ex.employee_name}</p>
                            <p className="text-xs text-slate-400">{ex.employee_email}</p>
                          <p className="text-[10px] text-slate-400">
                            {ex.employee_status === "INACTIVE" ? "Exited" : ex.employee_status}
                          </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                        {fmtDate(ex.exit_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[140px]">
                        <span className="truncate block">{ex.department_name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[160px]">
                        <span className="truncate block">{ex.position_title ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r && <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", r.color)}>{r.label}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {t && <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", t.color)}>{t.label}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[160px]">
                        <span className="truncate block">{ex.next_move ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditTarget(ex)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Edit exit record">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setUndoTarget(ex)}
                            className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                            title="Undo exit">
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && exits.length > 0 && (
          <Pagination
            page={page} pageSize={pageSize} total={exits.length}
            onPageChange={setPage} onPageSizeChange={setPageSize}
            itemLabel="exit records"
          />
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <ExitFormModal
          employee={{ id: editTarget.employee_id, full_name: editTarget.employee_name, position_title: editTarget.position_title }}
          existingExit={editTarget}
          onSuccess={() => { setEditTarget(null); void load(); }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Undo confirmation */}
      <DeleteModal
        open={!!undoTarget}
        title="Undo Employee Exit"
        description="This will restore the employee to Active status. You will need to manually re-assign their position."
        itemName={undoTarget?.employee_name ?? ""}
        loading={undoing}
        onConfirm={confirmUndo}
        onCancel={() => setUndoTarget(null)}
      />
    </section>
  );
}
