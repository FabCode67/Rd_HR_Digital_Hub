"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "@/lib/api";
import {
  Department, Employee, EmployeeCreateInput, EmployeePositionDetail,
  EmployeeStatus, EmployeeUpdateInput, Position,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Calendar, Loader2, Pencil, Plus, Trash2, X, Search, Users, UserCheck, UserX, UserMinus } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";

type Stats = { total: number; active: number; inactive: number; suspended: number; terminated: number };
type FormState = { full_name: string; email: string; phone: string; date_of_birth: string; national_id: string; status: EmployeeStatus };
type PosAssign = { departmentId: string; positionId: string; startDate: string };

const STATUSES: EmployeeStatus[] = ["ACTIVE","INACTIVE","SUSPENDED","TERMINATED"];
const emptyForm: FormState = { full_name: "", email: "", phone: "", date_of_birth: "", national_id: "", status: "ACTIVE" };
const emptyAssign: PosAssign = { departmentId: "", positionId: "", startDate: new Date().toISOString().slice(0,10) };

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  INACTIVE:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  SUSPENDED:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function toISO(d: string) { return `${d}T00:00:00`; }
function fmtDate(v?: string) { return v ? new Date(v).toLocaleDateString() : "—"; }

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

export default function EmployeeManagement() {
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [departments, setDepartments]     = useState<Department[]>([]);
  const [deptPositions, setDeptPositions] = useState<Position[]>([]);
  const [formPositions, setFormPositions] = useState<Position[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  // Filters
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Form drawer
  const [form, setForm]             = useState<FormState>(emptyForm);
  const [posAssign, setPosAssign]   = useState<PosAssign>(emptyAssign);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Position modal
  const [posModal, setPosModal]           = useState<Employee | null>(null);
  const [currentAssign, setCurrentAssign] = useState<EmployeePositionDetail | null>(null);
  const [history, setHistory]             = useState<EmployeePositionDetail[]>([]);
  const [modalDeptId, setModalDeptId]     = useState("");
  const [modalPosId, setModalPosId]       = useState("");
  const [modalDate, setModalDate]         = useState(new Date().toISOString().slice(0,10));

  const toast = useToast();

  const filtered = useMemo(() => {
    let list = employees;
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
    }
    return list;
  }, [employees, search, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, depts, s] = await Promise.all([
        apiClient.employee.getAll(0, 500),
        apiClient.department.getAll(0, 200),
        apiClient.employee.getStats(),
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setStats(s);
    } catch (err) {
      toast.error("Load failed", err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadDeptPositions = async (deptId: string, setter: React.Dispatch<React.SetStateAction<Position[]>>) => {
    if (!deptId) { setter([]); return; }
    try { setter(await apiClient.position.getAll(deptId, 0, 200)); }
    catch { setter([]); }
  };

  // ── Drawer ────────────────────────────────────────────────────────────────
  const openNew = () => { setForm(emptyForm); setPosAssign(emptyAssign); setFormPositions([]); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (e: Employee) => {
    setForm({ full_name: e.full_name, email: e.email, phone: e.phone ?? "", date_of_birth: e.date_of_birth ?? "", national_id: e.national_id ?? "", status: e.status });
    setEditingId(e.id); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingId(null); setForm(emptyForm); setPosAssign(emptyAssign); };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    const payload = { full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, date_of_birth: form.date_of_birth || undefined, national_id: form.national_id.trim() || undefined, status: form.status };
    try {
      if (editingId) {
        await apiClient.employee.update(editingId, payload as EmployeeUpdateInput);
        toast.success("Employee updated", `${form.full_name} updated.`);
      } else {
        const created = await apiClient.employee.create(payload as EmployeeCreateInput);
        if (posAssign.positionId) {
          await apiClient.employee.assignPosition(created.id, { employee_id: created.id, position_id: posAssign.positionId, start_date: toISO(posAssign.startDate) });
        }
        toast.success("Employee created", `${form.full_name} added.`);
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
      await apiClient.employee.delete(deleteTarget.id);
      toast.success("Deleted", `${deleteTarget.full_name} removed.`);
      await load();
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Position modal ─────────────────────────────────────────────────────────
  const openPosModal = async (emp: Employee) => {
    setPosModal(emp);
    setModalPosId(""); setModalDate(new Date().toISOString().slice(0,10));
    try {
      const [cur, hist] = await Promise.all([
        apiClient.employee.getCurrentPosition(emp.id).catch(() => null),
        apiClient.employee.getPositionHistory(emp.id).catch(() => []),
      ]);
      setCurrentAssign(cur);
      setHistory(hist);
      const deptId = cur?.position?.department_id || departments[0]?.id || "";
      setModalDeptId(deptId);
      await loadDeptPositions(deptId, setDeptPositions);
    } catch { setCurrentAssign(null); setHistory([]); }
  };

  const closePosModal = () => { setPosModal(null); setCurrentAssign(null); setHistory([]); setModalDeptId(""); setModalPosId(""); };

  const submitAssign = async () => {
    if (!posModal || !modalPosId || !modalDeptId) { toast.error("Validation", "Select a department and position."); return; }
    setSaving(true);
    try {
      const payload = { employee_id: posModal.id, position_id: modalPosId, start_date: toISO(modalDate) };
      if (currentAssign) await apiClient.employee.reassignPosition(posModal.id, payload);
      else await apiClient.employee.assignPosition(posModal.id, payload);
      toast.success("Position assigned", "Assignment updated.");
      await openPosModal(posModal);
      setModalPosId("");
    } catch (err) {
      toast.error("Assign failed", err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const endAssign = async () => {
    if (!currentAssign) return;
    setSaving(true);
    try {
      await apiClient.employee.unassignPosition(currentAssign.id, toISO(modalDate));
      toast.success("Assignment ended", "Employee unassigned.");
      if (posModal) await openPosModal(posModal);
    } catch (err) {
      toast.error("Failed", err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Employees</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage all employee records</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> New Employee
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard icon={Users}     label="Total"      value={stats.total}      color="bg-slate-500"   />
          <StatCard icon={UserCheck} label="Active"     value={stats.active}     color="bg-emerald-500" />
          <StatCard icon={UserMinus} label="Inactive"   value={stats.inactive}   color="bg-slate-400"   />
          <StatCard icon={UserX}     label="Suspended"  value={stats.suspended}  color="bg-amber-500"   />
          <StatCard icon={UserX}     label="Terminated" value={stats.terminated} color="bg-red-500"     />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="field pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="field w-44">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
            {(statusFilter || search) && <span className="ml-1 text-slate-400 font-normal">(filtered)</span>}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">No employees match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  {["Name", "Email", "Phone", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(emp => (
                  <tr key={emp.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
                          {emp.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{emp.email}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{emp.phone || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_COLORS[emp.status])}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {emp.status.charAt(0) + emp.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(emp)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => void openPosModal(emp)}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300 transition-colors">
                          <Calendar className="h-3 w-3" /> Position
                        </button>
                        <button onClick={() => setDeleteTarget(emp)}
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

      {/* Employee form drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={closeDrawer}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingId ? "Edit Employee" : "New Employee"}</h2>
              <button onClick={closeDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="field" placeholder="Full name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="field" placeholder="email@example.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="field" placeholder="+250 7xx xxx xxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">National ID</label>
                  <input value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} className="field" placeholder="ID number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EmployeeStatus }))} className="field">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>

              {!editingId && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assign Position (optional)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Department</label>
                      <select value={posAssign.departmentId} onChange={e => { setPosAssign(p => ({ ...p, departmentId: e.target.value })); void loadDeptPositions(e.target.value, setFormPositions); }} className="field">
                        <option value="">Select</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Position</label>
                      <select value={posAssign.positionId} onChange={e => setPosAssign(p => ({ ...p, positionId: e.target.value }))} className="field" disabled={!posAssign.departmentId}>
                        <option value="">{posAssign.departmentId ? "Select" : "Pick department first"}</option>
                        {formPositions.map(p => <option key={p.id} value={p.id}>{p.title} {p.is_vacant ? "• Vacant" : "• Occupied"}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                    <input type="date" value={posAssign.startDate} onChange={e => setPosAssign(p => ({ ...p, startDate: e.target.value }))} className="field" />
                  </div>
                </div>
              )}
            </form>
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={closeDrawer} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" onClick={submit} disabled={saving || !form.full_name.trim() || !form.email.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position modal */}
      {posModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closePosModal}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{posModal.full_name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Position management</p>
              </div>
              <button onClick={closePosModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Assign */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{currentAssign ? "Reassign Position" : "Assign Position"}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Department</label>
                    <select value={modalDeptId} onChange={e => { setModalDeptId(e.target.value); setModalPosId(""); void loadDeptPositions(e.target.value, setDeptPositions); }} className="field">
                      <option value="">Select</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Position</label>
                    <select value={modalPosId} onChange={e => setModalPosId(e.target.value)} className="field" disabled={!modalDeptId}>
                      <option value="">{modalDeptId ? "Select" : "Pick department first"}</option>
                      {deptPositions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                    <input type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} className="field" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={submitAssign} disabled={saving || !modalPosId}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {currentAssign ? "Reassign" : "Assign"}
                  </button>
                  {currentAssign && (
                    <button onClick={endAssign} disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-60 transition-colors">
                      End Assignment
                    </button>
                  )}
                </div>
              </div>

              {/* Current */}
              {currentAssign && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">Current Position</p>
                  <div className="grid gap-2 text-sm text-emerald-800 dark:text-emerald-200 sm:grid-cols-2">
                    <p><strong>Position:</strong> {currentAssign.position.title}</p>
                    <p><strong>Department:</strong> {departments.find(d => d.id === currentAssign.position.department_id)?.name ?? "—"}</p>
                    <p><strong>Since:</strong> {fmtDate(currentAssign.start_date)}</p>
                  </div>
                </div>
              )}

              {/* History */}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Position History</p>
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map(a => (
                      <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.position.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {departments.find(d => d.id === a.position.department_id)?.name ?? "—"} · {fmtDate(a.start_date)}{a.end_date ? ` → ${fmtDate(a.end_date)}` : ""}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          a.is_current ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")}>
                          {a.is_current ? "Current" : "Past"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">No position history.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteModal open={!!deleteTarget} title="Delete Employee"
        description="This will permanently remove the employee and all their records."
        itemName={deleteTarget?.full_name ?? ""} loading={deleting}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </section>
  );
}
