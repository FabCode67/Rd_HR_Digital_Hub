"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { Department, Position, PositionCreateInput, PositionUpdateInput, PositionLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, Search, X, BriefcaseBusiness, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";

type Stats = { total: number; filled: number; vacant: number; fill_rate: number };
type FormState = { title: string; description: string; department_id: string; parent_position_id: string; level: PositionLevel; band: string; is_active: boolean };

const LEVELS: PositionLevel[] = ["Director","Head","Manager","Senior Manager","Assistant Manager","Officer","Graduate Trainee","Intern"];
const emptyForm: FormState = { title: "", description: "", department_id: "", parent_position_id: "", level: "Officer", band: "", is_active: true };

const LEVEL_COLORS: Record<string, string> = {
  Director: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Head: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Manager: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Senior Manager": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Assistant Manager": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Officer: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Graduate Trainee": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Intern: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3", color)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] opacity-60">{sub}</p>}
    </div>
  );
}

export default function PositionManagement() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [vacantFilter, setVacantFilter] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = positions;
    if (deptFilter) list = list.filter(p => p.department_id === deptFilter);
    if (vacantFilter) list = list.filter(p => p.is_vacant);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [positions, search, deptFilter, vacantFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, depts, s] = await Promise.all([
        apiClient.position.getAll(undefined, 0, 500),
        apiClient.department.getAll(0, 200),
        apiClient.position.getStats(),
      ]);
      setPositions(pos);
      setDepartments(depts);
      setStats(s);
    } catch (err) {
      toast.error("Load failed", err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (p: Position) => {
    setForm({ title: p.title, description: p.description ?? "", department_id: p.department_id, parent_position_id: p.parent_position_id ?? "", level: p.level, band: p.band ?? "", is_active: p.is_active });
    setEditingId(p.id);
    setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingId(null); setForm(emptyForm); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department_id) { toast.error("Validation", "Please select a department."); return; }
    setSaving(true);
    const payload = { title: form.title.trim(), description: form.description.trim() || undefined, department_id: form.department_id, parent_position_id: form.parent_position_id || null, level: form.level, band: form.band.trim() || undefined, is_active: form.is_active };
    try {
      if (editingId) {
        await apiClient.position.update(editingId, payload as PositionUpdateInput);
        toast.success("Position updated", `"${form.title}" updated.`);
      } else {
        await apiClient.position.create(payload as PositionCreateInput);
        toast.success("Position created", `"${form.title}" added.`);
      }
      await load();
      closeDrawer();
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.position.delete(deleteTarget.id);
      toast.success("Deleted", `"${deleteTarget.title}" removed.`);
      await load();
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Positions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage all roles and position hierarchy</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> New Position
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} color="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
          <StatCard label="Filled" value={stats.filled} color="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" />
          <StatCard label="Vacant" value={stats.vacant} color="border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200" />
          <StatCard label="Fill Rate" value={`${stats.fill_rate}%`} color="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search positions…" className="field pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="field w-48">
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={() => setVacantFilter(v => !v)}
          className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            vacantFilter ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
          <AlertCircle className="h-3.5 w-3.5" /> Vacant only
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} position{filtered.length !== 1 ? "s" : ""}
            {(deptFilter || vacantFilter || search) && <span className="ml-1 text-slate-400 font-normal">(filtered)</span>}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">No positions match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  {["Title", "Department", "Level", "Band", "Vacancy", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(pos => (
                  <tr key={pos.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{pos.title}</div>
                      {pos.description && <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">{pos.description}</div>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {departments.find(d => d.id === pos.department_id)?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", LEVEL_COLORS[pos.level] ?? LEVEL_COLORS.Officer)}>
                        {pos.level}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{pos.band || "—"}</td>
                    <td className="px-5 py-3">
                      {pos.is_vacant
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><AlertCircle className="h-3 w-3" /> Vacant</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Filled</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(pos)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(pos)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 transition-colors">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Edit Position" : "New Position"}</h2>
              <button onClick={closeDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="field" placeholder="Position title" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department <span className="text-red-500">*</span></label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} className="field" required>
                    <option value="">Select</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Level</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as PositionLevel }))} className="field">
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Band</label>
                  <input value={form.band} onChange={e => setForm(f => ({ ...f, band: e.target.value }))} className="field" placeholder="e.g. A1, B2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Position</label>
                  <select value={form.parent_position_id} onChange={e => setForm(f => ({ ...f, parent_position_id: e.target.value }))} className="field">
                    <option value="">None</option>
                    {positions.filter(p => p.id !== editingId).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="field min-h-20" placeholder="Optional description" />
              </div>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-cyan-600" />
                Active
              </label>
            </form>
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={closeDrawer} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" onClick={submit} disabled={saving || !form.title.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={!!deleteTarget} title="Delete Position" itemName={deleteTarget?.title ?? ""}
        loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </section>
  );
}
