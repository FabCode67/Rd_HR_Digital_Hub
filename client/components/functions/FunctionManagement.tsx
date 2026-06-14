"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { OrgFunction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, X, Search, Layers3 } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";

const PRESET_COLORS = [
  "#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444",
  "#3b82f6","#ec4899","#f97316","#84cc16","#6366f1",
];

type FormState = { name: string; description: string; color: string; is_active: boolean };
const emptyForm: FormState = { name: "", description: "", color: "#06b6d4", is_active: true };

export default function FunctionManagement() {
  const [functions, setFunctions]         = useState<OrgFunction[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [search, setSearch]               = useState("");
  const [form, setForm]                   = useState<FormState>(emptyForm);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<OrgFunction | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const toast = useToast();

  const filtered = functions.filter(f =>
    !search.trim() || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const load = useCallback(async () => {
    setLoading(true);
    try { setFunctions(await apiClient.functions.getAll()); }
    catch (err) { toast.error("Load failed", err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openNew  = () => { setForm(emptyForm); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (f: OrgFunction) => {
    setForm({ name: f.name, description: f.description ?? "", color: f.color ?? "#06b6d4", is_active: f.is_active });
    setEditingId(f.id); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingId(null); setForm(emptyForm); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, color: form.color, is_active: form.is_active };
    try {
      if (editingId) { await apiClient.functions.update(editingId, payload); toast.success("Updated", `"${form.name}" updated.`); }
      else           { await apiClient.functions.create(payload);             toast.success("Created", `"${form.name}" added.`); }
      await load(); closeDrawer();
    } catch (err) { toast.error("Save failed", err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.functions.delete(deleteTarget.id);
      toast.success("Deleted", `"${deleteTarget.name}" removed.`);
      await load();
    } catch (err) { toast.error("Delete failed", err instanceof Error ? err.message : "Failed"); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Business Functions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Top-level groupings that departments belong to — e.g. Business, Support, Security</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> New Function
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total", value: functions.length, color: "bg-cyan-500" },
          { label: "Active", value: functions.filter(f => f.is_active).length, color: "bg-emerald-500" },
          { label: "Inactive", value: functions.filter(f => !f.is_active).length, color: "bg-slate-400" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
              <Layers3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search functions…" className="field pl-9 pr-9" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{filtered.length} function{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Layers3 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">{search ? "No functions match." : "No functions yet — create your first one."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>{["Function","Description","Status","Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(fn => (
                  <tr key={fn.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center" style={{ background: fn.color ?? "#06b6d4" }}>
                          <Layers3 className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{fn.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 max-w-xs"><span className="line-clamp-1">{fn.description || "—"}</span></td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        fn.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{fn.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(fn)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(fn)}
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Edit Function" : "New Function"}</h2>
              <button onClick={closeDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="field" placeholder="e.g. Business, Support, Security, IT" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="field min-h-20" placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Colour</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn("h-8 w-8 rounded-lg transition-all", form.color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105")}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 p-0.5" title="Custom colour" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded" style={{ background: form.color }} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{form.color}</span>
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-cyan-600" />
                Active
              </label>
            </form>
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={closeDrawer} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" onClick={submit} disabled={saving || !form.name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={!!deleteTarget} title="Delete Function"
        description="Departments in this function will be unlinked but not deleted."
        itemName={deleteTarget?.name ?? ""} loading={deleting}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </section>
  );
}
