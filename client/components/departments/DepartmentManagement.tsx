"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { Department, DepartmentCreateInput, DepartmentUpdateInput, OrgFunction } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Loader2, Plus, Pencil, Trash2, Search, X,
  Building2, Network, Layers, ChevronDown, ChevronRight, Layers3,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";
import DepartmentNode from "@/components/org-tree/DepartmentNode";

type Stats = { total: number; root: number; with_positions: number; empty: number };
type FormState = { name: string; description: string; parent_id: string; function_id: string; is_active: boolean };
const emptyForm: FormState = { name: "", description: "", parent_id: "", function_id: "", is_active: true };

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function DepartmentManagement() {
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [functions, setFunctions]       = useState<OrgFunction[]>([]);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [filterFn, setFilterFn]         = useState("");
  const [form, setForm]                 = useState<FormState>(emptyForm);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [treeOpen, setTreeOpen]         = useState(false);
  const toast = useToast();

  const rootDepartments = useMemo(() => departments.filter(d => !d.parent_id), [departments]);

  const filtered = useMemo(() => {
    let list = departments;
    if (filterFn) list = list.filter(d => d.function_id === filterFn);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q));
    }
    return list;
  }, [departments, search, filterFn]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s, fns] = await Promise.all([
        apiClient.department.getAll(0, 200),
        apiClient.department.getStats(),
        apiClient.functions.getAll(),
      ]);
      setDepartments(data);
      setStats(s);
      setFunctions(fns);
    } catch (err) {
      toast.error("Load failed", err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (d: Department) => {
    setForm({
      name: d.name, description: d.description ?? "",
      parent_id: d.parent_id ?? "", function_id: d.function_id ?? "",
      is_active: d.is_active,
    });
    setEditingId(d.id);
    setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingId(null); setForm(emptyForm); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      parent_id: form.parent_id || null,
      function_id: form.function_id || null,
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        await apiClient.department.update(editingId, payload as DepartmentUpdateInput);
        toast.success("Department updated", `"${form.name}" has been updated.`);
      } else {
        await apiClient.department.create(payload as DepartmentCreateInput);
        toast.success("Department created", `"${form.name}" has been added.`);
      }
      await load();
      closeDrawer();
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.department.delete(deleteTarget.id);
      toast.success("Deleted", `"${deleteTarget.name}" removed.`);
      await load();
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const functionMap = useMemo(() =>
    Object.fromEntries(functions.map(f => [f.id, f])),
    [functions]
  );

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Organise your company structure within business functions</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> New Department
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Building2} label="Total"          value={stats.total}          color="bg-cyan-500" />
          <StatCard icon={Layers3}   label="Functions"      value={functions.length}      color="bg-violet-500" />
          <StatCard icon={Layers}    label="With positions" value={stats.with_positions}  color="bg-emerald-500" />
          <StatCard icon={Building2} label="Empty"          value={stats.empty}           color="bg-amber-500" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…" className="field pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <select value={filterFn} onChange={e => setFilterFn(e.target.value)} className="field w-48">
          <option value="">All functions</option>
          {functions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} department{filtered.length !== 1 ? "s" : ""}
            {filterFn && <span className="ml-1 text-slate-400 font-normal">(filtered)</span>}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">
            {search || filterFn ? "No departments match your filters." : "No departments yet. Create one to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  {["Name", "Function", "Parent", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(dept => {
                  const fn = dept.function_id ? functionMap[dept.function_id] : null;
                  return (
                    <tr key={dept.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{dept.name}</div>
                        {dept.description && <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">{dept.description}</div>}
                      </td>
                      <td className="px-5 py-3">
                        {fn ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{ background: fn.color ?? "#06b6d4" }}>
                            <Layers3 className="h-3 w-3" /> {fn.name}
                          </span>
                        ) : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {departments.find(p => p.id === dept.parent_id)?.name ?? <span className="text-slate-300 dark:text-slate-600">Root</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          dept.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {dept.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(dept)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button onClick={() => setDeleteTarget(dept)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 transition-colors">
                            <Trash2 className="h-3 w-3" /> Delete
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
      </div>

      {/* Hierarchy view grouped by function */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <button onClick={() => setTreeOpen(o => !o)}
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-slate-400" />
            Hierarchy view
          </div>
          {treeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {treeOpen && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
            {functions.length > 0 ? (
              functions.map(fn => {
                const fnDepts = rootDepartments.filter(d => d.function_id === fn.id);
                if (fnDepts.length === 0) return null;
                return (
                  <div key={fn.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-4 w-4 rounded" style={{ background: fn.color ?? "#06b6d4" }} />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{fn.name}</span>
                    </div>
                    <div className="pl-6 space-y-2 border-l-2" style={{ borderColor: fn.color ?? "#06b6d4" }}>
                      {fnDepts.map(d => <DepartmentNode key={d.id} department={d} level={0} />)}
                    </div>
                  </div>
                );
              })
            ) : null}
            {/* Unassigned departments */}
            {rootDepartments.filter(d => !d.function_id).length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Unassigned</span>
                </div>
                <div className="pl-6 space-y-2 border-l-2 border-slate-300 dark:border-slate-600">
                  {rootDepartments.filter(d => !d.function_id).map(d => <DepartmentNode key={d.id} department={d} level={0} />)}
                </div>
              </div>
            )}
            {rootDepartments.length === 0 && <p className="text-sm text-slate-400">No root departments.</p>}
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingId ? "Edit Department" : "New Department"}
              </h2>
              <button onClick={closeDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="field" placeholder="Department name" required />
              </div>

              {/* Function selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Business Function <span className="text-xs font-normal text-slate-400">(required)</span>
                </label>
                {functions.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    No functions defined yet. <a href="/dashboard/functions" className="underline font-medium">Create one first →</a>
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {functions.map(fn => (
                      <label key={fn.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border-2 p-2.5 cursor-pointer transition-all",
                          form.function_id === fn.id
                            ? "border-current ring-1 ring-current/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                        style={form.function_id === fn.id ? { borderColor: fn.color ?? "#06b6d4", color: fn.color ?? "#06b6d4" } : {}}>
                        <input type="radio" name="function_id" value={fn.id}
                          checked={form.function_id === fn.id}
                          onChange={() => setForm(f => ({ ...f, function_id: fn.id }))}
                          className="sr-only" />
                        <div className="h-5 w-5 shrink-0 rounded flex items-center justify-center"
                          style={{ background: fn.color ?? "#06b6d4" }}>
                          <Layers3 className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{fn.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Department</label>
                <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} className="field">
                  <option value="">Root department</option>
                  {departments.filter(d => d.id !== editingId).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="field min-h-20" placeholder="Optional description" />
              </div>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600" />
                Active
              </label>
            </form>
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={closeDrawer}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button type="submit" onClick={submit} disabled={saving || !form.name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={!!deleteTarget} title="Delete Department" itemName={deleteTarget?.name ?? ""}
        loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </section>
  );
}
