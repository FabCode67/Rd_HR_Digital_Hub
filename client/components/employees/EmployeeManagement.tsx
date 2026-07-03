"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api";
import {
  Department, Employee, EmployeeCreateInput, EmployeePositionDetail,
  EmployeeStatus, EmployeeUpdateInput, Position, WORK_LOCATIONS,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Calendar, Loader2, Pencil, Plus, Trash2, X, Search,
  Users, UserCheck, UserX, UserMinus, TrendingUp, Camera,
  LogOut as ExitIcon, ChevronRight, ChevronLeft, MoreVertical,
  CheckCircle2, BookOpen, Briefcase, User, Image as ImageIcon,
  GraduationCap, Award, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";
import CareerTimeline from "./CareerTimeline";
import { useAuth } from "@/contexts/AuthContext";
import { ExitFormModal } from "@/components/exits/ExitManagement";

type Stats = { total: number; active: number; inactive: number; suspended: number; terminated: number };
type FormState = {
  // Step 1 — Basic info
  full_name: string; email: string; phone: string;
  date_of_birth: string; national_id: string;
  gender: string; status: EmployeeStatus;
  nationality: string; marital_status: string; work_location: string;
  date_joined: string;
  // Step 2 — Employment
  employment_type: "permanent" | "temporary";
  contract_end_date: string;
  past_employer: string; past_position: string;
  // Step 3 — Position (assign on create)
  departmentId: string; positionId: string; startDate: string;
  // Step 5 — Education (added post-create)
  edu_record_type: string; edu_title: string; edu_institution: string;
  edu_field: string; edu_start: string; edu_end: string; edu_grade: string;
};

const STATUSES: EmployeeStatus[] = ["ACTIVE","INACTIVE","SUSPENDED","TERMINATED"];
// The Add/Edit Employee wizard only offers Active/Exited — Suspended and
// Terminated are set through their own dedicated flows (e.g. the exit
// process), not picked freely off this form.
const WIZARD_STATUS_OPTIONS: EmployeeStatus[] = ["ACTIVE","INACTIVE"];
const MARITAL_STATUSES = [
  { value: "single",   label: "Single" },
  { value: "married",  label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed",  label: "Widowed" },
];
const CORP_TITLES = [
  "Managing Director","Executive Director","Director",
  "Head of Department","Senior Manager","Manager",
  "Assistant Manager","Team Leader","Senior Officer",
  "Officer","Graduate Trainee","Intern",
];
const emptyForm: FormState = {
  full_name: "", email: "", phone: "", date_of_birth: "", national_id: "",
  gender: "", status: "ACTIVE",
  nationality: "", marital_status: "", work_location: "",
  date_joined: new Date().toISOString().slice(0,10),
  employment_type: "permanent", contract_end_date: "",
  past_employer: "", past_position: "",
  departmentId: "", positionId: "", startDate: new Date().toISOString().slice(0,10),
  edu_record_type: "degree", edu_title: "", edu_institution: "",
  edu_field: "", edu_start: "", edu_end: "", edu_grade: "",
};

// Wizard steps
const STEPS = [
  { id: 1, label: "Basic Info",   icon: User,           desc: "Personal details" },
  { id: 2, label: "Employment",   icon: Briefcase,      desc: "Contract & history" },
  { id: 3, label: "Position",     icon: Award,          desc: "Role assignment" },
  { id: 4, label: "Photo",        icon: ImageIcon,      desc: "Profile picture" },
  { id: 5, label: "Education",    icon: GraduationCap,  desc: "Academic record" },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:     "Active",
  INACTIVE:   "Exited",
  SUSPENDED:  "Suspended",
  TERMINATED: "Terminated",
};

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  INACTIVE:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  SUSPENDED:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function toISO(d: string) { return `${d}T00:00:00`; }
function fmtDate(v?: string) { return v ? new Date(v).toLocaleDateString() : "—"; }
function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 && age < 120 ? age : null;
}
function probationInfo(emp: Employee): { label: string; className: string } {
  if (emp.employment_type !== "permanent") {
    return { label: "N/A", className: "text-slate-400" };
  }
  if ((emp as any).probation_confirmed_at) {
    return { label: "Confirmed", className: "text-emerald-600 dark:text-emerald-400 font-medium" };
  }
  const end = (emp as any).probation_end_date as string | null | undefined;
  if (!end) return { label: "—", className: "text-slate-400" };
  const isOngoing = new Date(end).getTime() > Date.now();
  return isOngoing
    ? { label: "On Probation", className: "text-amber-600 dark:text-amber-400 font-medium" }
    : { label: "Pending Confirmation", className: "text-rose-600 dark:text-rose-400 font-medium" };
}

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

// ── Admin avatar upload for a specific employee ──────────────────────────────
function AdminAvatarUpload({ employee, token, onUploaded }: {
  employee: Employee;
  token: string | null;
  onUploaded: (url: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Images only."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5 MB."); return; }
    setUploading(true); setError("");
    try {
      const res = await apiClient.employee.uploadAvatar(employee.id, file, token ?? "");
      onUploaded(res.profile_image_url);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const initials = employee.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group">
        <div className="h-16 w-16 rounded-full overflow-hidden shadow">
          {employee.profile_image_url ? (
            <img src={employee.profile_image_url} alt={employee.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold text-white">
              {initials}
            </div>
          )}
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
        </button>
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors">
        <Camera className="h-3 w-3" /> {employee.profile_image_url ? "Change photo" : "Upload photo"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handle} />
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
  // Table columns: position/department/band per employee (from org tree),
  // and department -> function name (for the Function column)
  const [positionTree, setPositionTree]   = useState<any[]>([]);
  const [orgFunctions, setOrgFunctions]   = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom]     = useState("");  // filters by Date of Joining
  const [dateTo, setDateTo]         = useState("");

  // Form drawer
  const [form, setForm]             = useState<FormState>(emptyForm);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [createdEmpId, setCreatedEmpId] = useState<string | null>(null);
  // Step 5 — education list built before saving
  type EduEntry = {
    record_type: string; title: string; institution: string;
    description: string; start_date: string; end_date: string; grade: string;
    file?: File;
  };
  const emptyEdu: EduEntry = { record_type: "degree", title: "", institution: "", description: "", start_date: "", end_date: "", grade: "", file: undefined };
  const [eduEntries, setEduEntries]   = useState<EduEntry[]>([]);
  const [eduDraft,   setEduDraft]     = useState<EduEntry>({ ...emptyEdu });
  const [eduFileErr, setEduFileErr]   = useState("");
  const eduFileRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Career timeline
  const [timelineEmployee, setTimelineEmployee] = useState<Employee | null>(null);

  // Expiring alerts
  const [alerts, setAlerts] = useState<any[]>([]);
  // Full probation roster (everyone still on probation, not just those expiring soon)
  const [probationRoster, setProbationRoster] = useState<any[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showProbationTracker, setShowProbationTracker] = useState(false);
  const [extendModal, setExtendModal] = useState<{ emp: Employee; type: "probation" | "contract" } | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [extending, setExtending] = useState(false);

  // Position modal
  const [posModal, setPosModal]           = useState<Employee | null>(null);
  const [currentAssign, setCurrentAssign] = useState<EmployeePositionDetail | null>(null);
  const [history, setHistory]             = useState<EmployeePositionDetail[]>([]);
  const [modalDeptId, setModalDeptId]     = useState("");
  const [modalPosId, setModalPosId]       = useState("");
  const [modalDate, setModalDate]         = useState(new Date().toISOString().slice(0,10));

  const toast = useToast();
  const { token } = useAuth();

  // Avatar upload state (for edit drawer)
  const [avatarEmployee, setAvatarEmployee] = useState<Employee | null>(null);

  // Exit state
  const [exitEmployee, setExitEmployee] = useState<Employee | null>(null);

  // Actions dropdown (per-row)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = employees;
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
    }
    if (dateFrom || dateTo) {
      list = list.filter(e => {
        const joined = ((e as any).date_joined || (e as any).created_at || "").slice(0, 10);
        if (!joined) return false;
        if (dateFrom && joined < dateFrom) return false;
        if (dateTo   && joined > dateTo)   return false;
        return true;
      });
    }
    return list;
  }, [employees, search, statusFilter, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, depts, s, tree, funcs] = await Promise.all([
        apiClient.employee.getAll(0, 500),
        apiClient.department.getAll(0, 200),
        apiClient.employee.getStats(),
        apiClient.position.getOrganizationTree().catch(() => []),
        apiClient.functions.getAll().catch(() => []),
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setStats(s);
      setPositionTree(tree);
      setOrgFunctions(funcs);
      // Load expiring alerts
      try {
        const a = await apiClient.employee.getExpiringAlerts();
        setAlerts(a.alerts || []);
      } catch { /* non-critical */ }
      // Load full probation roster
      try {
        const p = await apiClient.employee.getProbationRoster();
        setProbationRoster(p.roster || []);
      } catch { /* non-critical */ }
    } catch (err) {
      toast.error("Load failed", err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // employee_id -> { title, band, level, departmentId } — built by walking the
  // organization tree (departments -> positions -> employee) once per load.
  const employeePositionMap = useMemo(() => {
    const map = new Map<string, { title: string; band: string | null; level: string; departmentId: string; departmentName: string }>();
    const walkPositions = (positions: any[], departmentId: string, departmentName: string) => {
      (positions ?? []).forEach((p: any) => {
        if (p.employee) {
          map.set(p.employee.id, {
            title: p.title, band: p.band ?? null, level: p.level,
            departmentId, departmentName,
          });
        }
        if (p.children?.length) walkPositions(p.children, departmentId, departmentName);
      });
    };
    const walkDepts = (nodes: any[]) => {
      (nodes ?? []).forEach((d: any) => {
        walkPositions(d.positions, d.id, d.name);
        if (d.children?.length) walkDepts(d.children);
      });
    };
    walkDepts(positionTree);
    return map;
  }, [positionTree]);

  // department_id -> function name (via Department.function_id)
  const deptFunctionMap = useMemo(() => {
    const funcById = new Map(orgFunctions.map(f => [f.id, f.name]));
    const map = new Map<string, string>();
    departments.forEach(d => {
      if ((d as any).function_id) map.set(d.id, funcById.get((d as any).function_id) ?? "—");
    });
    return map;
  }, [departments, orgFunctions]);

  const loadDeptPositions = async (deptId: string, setter: React.Dispatch<React.SetStateAction<Position[]>>) => {
    if (!deptId) { setter([]); return; }
    try { setter(await apiClient.position.getAll(deptId, 0, 200)); }
    catch { setter([]); }
  };

  // ── Drawer ────────────────────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm); setEditingId(null);
    setWizardStep(1); setCreatedEmpId(null);
    setFormPositions([]); setEduEntries([]); setEduDraft({ ...emptyEdu });
    setDrawerOpen(true);
  };
  const openEdit = (e: Employee) => {
    setForm({
      full_name: e.full_name, email: e.email, phone: e.phone ?? "",
      date_of_birth: e.date_of_birth ?? "", national_id: e.national_id ?? "",
      gender: (e as any).gender ?? "", status: e.status,
      nationality: (e as any).nationality ?? "",
      marital_status: (e as any).marital_status ?? "",
      work_location: (e as any).work_location ?? "",
      date_joined: (e as any).date_joined
        ? (e as any).date_joined.slice(0,10)
        : (e as any).created_at ? (e as any).created_at.slice(0,10) : new Date().toISOString().slice(0,10),
      employment_type: e.employment_type ?? "permanent",
      contract_end_date: e.contract_end_date ? e.contract_end_date.slice(0,10) : "",
      past_employer: e.past_employer ?? "", past_position: e.past_position ?? "",
      departmentId: "", positionId: "", startDate: new Date().toISOString().slice(0,10),
      edu_record_type: "degree", edu_title: "", edu_institution: "",
      edu_field: "", edu_start: "", edu_end: "", edu_grade: "",
    });
    setAvatarEmployee(e);
    setEditingId(e.id); setWizardStep(1); setCreatedEmpId(e.id);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false); setEditingId(null); setForm(emptyForm);
    setWizardStep(1); setCreatedEmpId(null); setAvatarEmployee(null);
    setFormPositions([]); setEduEntries([]); setEduDraft({ ...emptyEdu });
  };

  // ── Step save handlers ──────────────────────────────────────────────────
  const saveBasicInfo = async () => {
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(), email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      date_of_birth: form.date_of_birth || undefined,
      national_id: form.national_id.trim() || undefined,
      status: form.status, gender: form.gender || undefined,
      nationality: form.nationality.trim() || undefined,
      marital_status: form.marital_status || undefined,
      work_location: form.work_location || undefined,
      date_joined: form.date_joined || undefined,
      employment_type: form.employment_type,
    };
    try {
      if (editingId || createdEmpId) {
        const id = editingId || createdEmpId!;
        await apiClient.employee.update(id, payload as EmployeeUpdateInput);
        const updated = await apiClient.employee.getById?.(id).catch(() => null);
        if (updated) setAvatarEmployee(updated);
        toast.success("Saved", "Basic info updated.");
      } else {
        const created = await apiClient.employee.create(payload as EmployeeCreateInput);
        setCreatedEmpId(created.id);
        setAvatarEmployee(created);
        toast.success("Employee created", `${form.full_name} added — continue filling in details.`);
      }
      await load();
      setWizardStep(2);
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const saveEmployment = async () => {
    const id = editingId || createdEmpId;
    if (!id) { setWizardStep(3); return; }
    setSaving(true);
    try {
      await apiClient.employee.update(id, {
        employment_type: form.employment_type,
        contract_end_date: form.employment_type === "temporary" && form.contract_end_date
          ? new Date(form.contract_end_date).toISOString() : undefined,
        past_employer: form.past_employer.trim() || undefined,
        past_position: form.past_position.trim() || undefined,
      } as EmployeeUpdateInput);
      toast.success("Saved", "Employment info updated.");
      await load();
      setWizardStep(3);
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const savePosition = async () => {
    const id = editingId || createdEmpId;
    if (!id || !form.positionId) { setWizardStep(4); return; }
    setSaving(true);
    try {
      const cur = await apiClient.employee.getCurrentPosition(id).catch(() => null);
      const payload = { employee_id: id, position_id: form.positionId, start_date: toISO(form.startDate) };
      if (cur) await apiClient.employee.reassignPosition(id, payload);
      else     await apiClient.employee.assignPosition(id, payload);
      toast.success("Position assigned", "Role assignment saved.");
      await load();
    } catch (err) {
      toast.error("Assign failed", err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
    setWizardStep(4);
  };

  const saveEducation = async () => {
    const id = editingId || createdEmpId;
    if (!id || eduEntries.length === 0) {
      toast.success("Complete", "Employee profile saved.");
      await load(); closeDrawer(); return;
    }
    setSaving(true);
    try {
      for (const entry of eduEntries) {
        const created = await apiClient.education.create(id, {
          record_type:  entry.record_type,
          title:        entry.title,
          institution:  entry.institution  || undefined,
          description:  entry.description  || undefined,
          start_date:   entry.start_date   ? toISO(entry.start_date) : undefined,
          end_date:     entry.end_date     ? toISO(entry.end_date)   : undefined,
          grade:        entry.grade        || undefined,
        });
        // Upload certificate if attached
        if (entry.file && token) {
          try {
            await apiClient.education.uploadCertificate(created.id, entry.file, token);
          } catch { /* non-critical */ }
        }
      }
      toast.success("Complete", `${eduEntries.length} education record${eduEntries.length > 1 ? "s" : ""} saved.`);
      await load(); closeDrawer();
    } catch (err) {
      toast.error("Education save failed", err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
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

  const handleConfirmProbation = async (emp: { employee_id: string; employee_name: string }) => {
    setConfirmingId(emp.employee_id);
    try {
      await apiClient.employee.confirmProbation(emp.employee_id);
      toast.success("Probation confirmed", `${emp.employee_name} has passed probation.`);
      await load();
    } catch (err) {
      toast.error("Failed", err instanceof Error ? err.message : "Could not confirm probation");
    } finally {
      setConfirmingId(null);
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

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            {alerts.length} expiring within 7 days
          </p>
          {alerts.map((a: any, i: number) => {
            const emp = employees.find(e => e.id === a.employee_id);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">{a.employee_name}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    a.type === "probation" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                  }`}>{a.type}</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{a.days_left} days left — ends {new Date(a.end_date).toLocaleDateString()}</p>
                </div>
                {emp && (
                  <button
                    onClick={() => { setExtendModal({ emp, type: a.type }); setExtendDate(""); setExtendReason(""); }}
                    className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-50 transition-colors">
                    Extend
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard icon={Users}     label="Total"      value={stats.total}      color="bg-slate-500"   />
          <StatCard icon={UserCheck} label="Active"     value={stats.active}     color="bg-emerald-500" />
          <StatCard icon={UserMinus} label="Exited"     value={stats.inactive}   color="bg-slate-400"   />
          <StatCard icon={UserX}     label="Suspended"  value={stats.suspended}  color="bg-amber-500"   />
          <StatCard icon={UserX}     label="Terminated" value={stats.terminated} color="bg-red-500"     />
        </div>
      )}

      {/* Probation Tracker */}
      {probationRoster.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <button
            onClick={() => setShowProbationTracker(s => !s)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Probation Tracker — {probationRoster.length} employee{probationRoster.length !== 1 ? "s" : ""} on probation
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {probationRoster.filter((r: any) => r.is_overdue).length > 0
                    ? `${probationRoster.filter((r: any) => r.is_overdue).length} past their probation end date — confirm or extend`
                    : "Confirm employees once their probation period is successfully completed"}
                </p>
              </div>
            </div>
            {showProbationTracker ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {showProbationTracker && (
            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {probationRoster.map((r: any) => (
                <div key={r.employee_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.employee_name}</p>
                    <p className={cn("text-xs", r.is_overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400")}>
                      {r.is_overdue
                        ? `Probation ended ${Math.abs(r.days_left)} day${Math.abs(r.days_left) !== 1 ? "s" : ""} ago — needs confirmation`
                        : `${r.days_left} day${r.days_left !== 1 ? "s" : ""} left · ends ${new Date(r.probation_end_date).toLocaleDateString()}`}
                      {r.probation_extended && <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">extended</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const emp = employees.find(e => e.id === r.employee_id);
                        if (emp) { setExtendModal({ emp, type: "probation" }); setExtendDate(""); setExtendReason(""); }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      Extend
                    </button>
                    <button
                      onClick={() => void handleConfirmProbation(r)}
                      disabled={confirmingId === r.employee_id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors">
                      {confirmingId === r.employee_id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <CheckCircle2 className="h-3 w-3" />}
                      Confirm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="field pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="field w-44">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
        </select>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Joined from</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field w-40" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Joined to</label>
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
                  {[
                    "Name", "Email", "Phone", "Gender", "Nationality",
                    "Position", "Department", "Band", "Employment Type",
                    "Date of Joining", "Date of Birth", "Age", "Status",
                    "Probation", "Location", "Function", "Actions",
                  ].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(emp => {
                  const posInfo = employeePositionMap.get(emp.id);
                  const age = calcAge(emp.date_of_birth);
                  const probation = probationInfo(emp);
                  const functionName = posInfo ? (deptFunctionMap.get(posInfo.departmentId) ?? "—") : "—";
                  return (
                  <tr key={emp.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden">
                          {emp.profile_image_url ? (
                            <img src={emp.profile_image_url} alt={emp.full_name}
                              className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
                              {emp.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{emp.email}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{emp.phone || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">{(emp as any).gender || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{(emp as any).nationality || "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{posInfo?.title ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{posInfo?.departmentName ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{posInfo?.band ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">{emp.employment_type ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate((emp as any).date_joined || (emp as any).created_at)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(emp.date_of_birth)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{age !== null ? `${age} yrs` : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", STATUS_COLORS[emp.status])}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {STATUS_LABELS[emp.status] ?? emp.status}
                      </span>
                    </td>
                    <td className={cn("px-5 py-3 text-xs whitespace-nowrap", probation.className)}>{probation.label}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{(emp as any).work_location || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{functionName}</td>
                    <td className="px-5 py-3 relative">
                      <div className="flex justify-end">
                        <button
                          onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === emp.id ? null : emp.id); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {actionMenuId === emp.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                          <div className="absolute right-5 top-10 z-50 w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 shadow-lg">
                            <button onClick={() => { openEdit(emp); setActionMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button onClick={() => { setTimelineEmployee(emp); setActionMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                              <TrendingUp className="h-3.5 w-3.5" /> Career
                            </button>
                            <button onClick={() => { void openPosModal(emp); setActionMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors">
                              <Calendar className="h-3.5 w-3.5" /> Position
                            </button>
                            {emp.status === "ACTIVE" && (
                              <button onClick={() => { setExitEmployee(emp); setActionMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                                <ExitIcon className="h-3.5 w-3.5" /> Exit
                              </button>
                            )}
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button onClick={() => { setDeleteTarget(emp); setActionMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Multi-step wizard modal ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeDrawer}>
          <div className="relative w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={e => e.stopPropagation()}>

            {/* ─ Header ─ */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? "Edit Employee" : "Add New Employee"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Step {wizardStep} of {STEPS.length} — {STEPS[wizardStep-1]?.label}
                </p>
              </div>
              <button onClick={closeDrawer} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ─ Step indicator ─ */}
            <div className="flex items-center gap-0 border-b border-slate-100 dark:border-slate-800 px-6 py-3 shrink-0 bg-slate-50 dark:bg-slate-900/60 overflow-x-auto">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = wizardStep > step.id;
                const active = wizardStep === step.id;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => {
                        // Only allow going back or to completed steps
                        if (step.id < wizardStep || (createdEmpId && step.id <= STEPS.length))
                          setWizardStep(step.id);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all shrink-0",
                        active ? "bg-cyan-50 dark:bg-cyan-950/30" : "hover:bg-slate-100 dark:hover:bg-slate-800",
                        (done || active || createdEmpId) ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                        done ? "bg-emerald-500" : active ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-700"
                      )}>
                        {done
                          ? <CheckCircle2 className="h-4 w-4 text-white" />
                          : <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-slate-500 dark:text-slate-400")} />}
                      </div>
                      <span className={cn("text-[10px] font-semibold whitespace-nowrap",
                        active ? "text-cyan-700 dark:text-cyan-300" :
                        done ? "text-emerald-600 dark:text-emerald-400" :
                        "text-slate-400")}>{step.label}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className={cn("h-px w-6 shrink-0 mx-1", wizardStep > step.id ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ─ Step content ─ */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* Step 1: Basic Info */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-cyan-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Personal Information</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="field" placeholder="Full legal name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email <span className="text-red-500">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="field" placeholder="email@ncba.co.rw" />
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date of Joining</label>
                      <input type="date" value={form.date_joined} onChange={e => setForm(f => ({ ...f, date_joined: e.target.value }))} className="field" />
                      <p className="mt-1 text-[11px] text-slate-400">Defaults to today — change it if the actual hire date is different.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">National ID</label>
                      <input value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} className="field" placeholder="ID number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EmployeeStatus }))} className="field">
                        {WIZARD_STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nationality</label>
                      <input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} className="field" placeholder="e.g. Rwandan" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Marital Status</label>
                      <select value={form.marital_status} onChange={e => setForm(f => ({ ...f, marital_status: e.target.value }))} className="field">
                        <option value="">Select marital status</option>
                        {MARITAL_STATUSES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Location of Work</label>
                      <select value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} className="field">
                        <option value="">Select location</option>
                        {WORK_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gender <span className="text-red-500">*</span></label>
                      <div className="flex gap-3">
                        {["male","female"].map(g => (
                          <label key={g} className={cn(
                            "flex flex-1 items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 cursor-pointer transition-all",
                            form.gender === g
                              ? g === "male" ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : "border-pink-400 bg-pink-50 dark:bg-pink-950/30"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          )}>
                            <input type="radio" name="gender" value={g} checked={form.gender === g}
                              onChange={() => setForm(f => ({ ...f, gender: g }))} className="sr-only" />
                            <span className={cn("text-sm font-semibold capitalize",
                              form.gender === g
                                ? g === "male" ? "text-blue-700 dark:text-blue-300" : "text-pink-700 dark:text-pink-300"
                                : "text-slate-700 dark:text-slate-300")}>
                              {g === "male" ? "♂ Male" : "♀ Female"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Employment */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-cyan-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Employment Details</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contract Type <span className="text-red-500">*</span></p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["permanent","temporary"] as const).map(t => (
                        <label key={t} className={cn(
                          "flex items-center gap-2.5 rounded-xl border-2 p-3 cursor-pointer transition-colors",
                          form.employment_type === t
                            ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}>
                          <input type="radio" name="employment_type" value={t}
                            checked={form.employment_type === t}
                            onChange={() => setForm(f => ({ ...f, employment_type: t }))}
                            className="text-cyan-600" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{t}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {t === "permanent" ? "21 days annual leave · 3 months probation" : "18 days annual leave · set end date"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {form.employment_type === "temporary" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contract End Date <span className="text-red-500">*</span></label>
                        <input type="date" value={form.contract_end_date}
                          onChange={e => setForm(f => ({ ...f, contract_end_date: e.target.value }))} className="field" />
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Previous Employment <span className="text-xs font-normal text-slate-400">(optional)</span></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Past Employer</label>
                        <input value={form.past_employer} onChange={e => setForm(f => ({ ...f, past_employer: e.target.value }))} className="field" placeholder="Previous company" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Position Held</label>
                        <input value={form.past_position} onChange={e => setForm(f => ({ ...f, past_position: e.target.value }))} className="field" placeholder="Previous role/title" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Position */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-cyan-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Position Assignment</p>
                    <span className="text-xs text-slate-400">(optional)</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Department</label>
                        <select value={form.departmentId}
                          onChange={e => {
                            setForm(f => ({ ...f, departmentId: e.target.value, positionId: "" }));
                            void loadDeptPositions(e.target.value, setFormPositions);
                          }} className="field">
                          <option value="">Select department</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Position</label>
                        <select value={form.positionId} onChange={e => setForm(f => ({ ...f, positionId: e.target.value }))} className="field" disabled={!form.departmentId}>
                          <option value="">{form.departmentId ? "Select position" : "Pick department first"}</option>
                          {formPositions.map(p => <option key={p.id} value={p.id}>{p.title}{p.is_vacant ? " • Vacant" : " • Occupied"}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="field" />
                      </div>
                    </div>
                    {!form.positionId && (
                      <p className="text-xs text-slate-400 italic">Skip this step if no position is being assigned yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Photo */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4 text-cyan-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Profile Photo</p>
                  </div>
                  {avatarEmployee ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                      <div className="relative">
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
                          {avatarEmployee.profile_image_url ? (
                            <img src={avatarEmployee.profile_image_url} alt={avatarEmployee.full_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 text-3xl font-bold text-white">
                              {avatarEmployee.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <AdminAvatarUpload
                        employee={avatarEmployee}
                        token={token}
                        onUploaded={url => {
                          setEmployees(prev => prev.map(e => e.id === avatarEmployee.id ? { ...e, profile_image_url: url } : e));
                          setAvatarEmployee(prev => prev ? { ...prev, profile_image_url: url } : prev);
                        }}
                      />
                      <p className="text-xs text-slate-400 text-center max-w-xs">Upload a professional photo. Max 5 MB. JPG or PNG recommended.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-12 text-center">
                      <ImageIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-slate-400">Complete step 1 first to enable photo upload.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Education */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-cyan-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Education &amp; Training</p>
                    <span className="text-xs text-slate-400">(optional)</span>
                  </div>

                  {/* Added records list */}
                  {eduEntries.length > 0 && (
                    <div className="space-y-2">
                      {eduEntries.map((entry, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{entry.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{entry.institution} {entry.grade ? `· ${entry.grade}` : ""}</p>
                            {entry.file && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">📎 {entry.file.name}</p>
                            )}
                          </div>
                          <button onClick={() => setEduEntries(list => list.filter((_, j) => j !== i))}
                            className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Draft form for next entry */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {eduEntries.length === 0 ? "Add education record" : "Add another record"}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Type */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type <span className="text-red-400">*</span></label>
                        <select value={eduDraft.record_type} onChange={e => setEduDraft(d => ({ ...d, record_type: e.target.value }))} className="field">
                          <option value="degree">Degree</option>
                          <option value="certification">Certification</option>
                          <option value="training">Training</option>
                          <option value="course">Course</option>
                        </select>
                      </div>
                      {/* Title */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title / Qualification <span className="text-red-400">*</span></label>
                        <input value={eduDraft.title} onChange={e => setEduDraft(d => ({ ...d, title: e.target.value }))} className="field" placeholder="e.g. BSc Computer Science" />
                      </div>
                      {/* Institution */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Institution</label>
                        <input value={eduDraft.institution} onChange={e => setEduDraft(d => ({ ...d, institution: e.target.value }))} className="field" placeholder="University of Rwanda" />
                      </div>
                      {/* Field of study */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Field of Study</label>
                        <input value={eduDraft.description} onChange={e => setEduDraft(d => ({ ...d, description: e.target.value }))} className="field" placeholder="Computer Science" />
                      </div>
                      {/* Grade */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Grade / GPA</label>
                        <input value={eduDraft.grade} onChange={e => setEduDraft(d => ({ ...d, grade: e.target.value }))} className="field" placeholder="First Class / 3.8" />
                      </div>
                      {/* Start date */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                        <input type="date" value={eduDraft.start_date} onChange={e => setEduDraft(d => ({ ...d, start_date: e.target.value }))} className="field" />
                      </div>
                      {/* End date */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Date / Expected</label>
                        <input type="date" value={eduDraft.end_date} onChange={e => setEduDraft(d => ({ ...d, end_date: e.target.value }))} className="field" />
                      </div>

                      {/* Certificate upload */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                          Certificate <span className="font-normal text-slate-400">(PDF or image · optional)</span>
                        </label>
                        <button type="button" onClick={() => eduFileRef.current?.click()}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-2.5 text-left transition-colors",
                            eduDraft.file
                              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20"
                              : "border-slate-300 dark:border-slate-600 hover:border-cyan-400 hover:bg-cyan-50/50"
                          )}>
                          {eduDraft.file ? (
                            <>
                              <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="flex-1 text-xs text-emerald-700 dark:text-emerald-300 truncate">{eduDraft.file.name}</span>
                              <button type="button" onClick={e => { e.stopPropagation(); setEduDraft(d => ({ ...d, file: undefined })); if (eduFileRef.current) eduFileRef.current.value = ""; }}
                                className="shrink-0 text-slate-400 hover:text-red-500">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="text-xs text-slate-500">Click to attach certificate (PDF, JPG, PNG · max 10 MB)</span>
                            </>
                          )}
                        </button>
                        {eduFileErr && <p className="mt-1 text-xs text-red-500">{eduFileErr}</p>}
                        <input ref={eduFileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > 10 * 1024 * 1024) { setEduFileErr("File must be under 10 MB"); return; }
                            setEduFileErr("");
                            setEduDraft(d => ({ ...d, file: f }));
                          }} />
                      </div>
                    </div>

                    {/* Add to list button */}
                    <button
                      type="button"
                      disabled={!eduDraft.title.trim()}
                      onClick={() => {
                        if (!eduDraft.title.trim()) return;
                        setEduEntries(list => [...list, { ...eduDraft }]);
                        setEduDraft({ ...emptyEdu });
                        setEduFileErr("");
                        if (eduFileRef.current) eduFileRef.current.value = "";
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-cyan-300 dark:border-cyan-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center">
                      <Plus className="h-4 w-4" /> Add Record
                    </button>
                  </div>

                  {eduEntries.length === 0 && (
                    <p className="text-center text-xs text-slate-400">No records added yet — click "Add Record" above or skip this step.</p>
                  )}
                </div>
              )}
            </div>

            {/* ─ Footer navigation ─ */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-3">
              {/* Back */}
              {wizardStep > 1 && (
                <button onClick={() => setWizardStep(s => s - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}

              <div className="flex-1" />

              {/* Step progress dots */}
              <div className="flex gap-1.5">
                {STEPS.map(s => (
                  <div key={s.id} className={cn("h-1.5 rounded-full transition-all",
                    s.id === wizardStep ? "w-6 bg-cyan-500" :
                    s.id < wizardStep ? "w-1.5 bg-emerald-400" :
                    "w-1.5 bg-slate-200 dark:bg-slate-700"
                  )} />
                ))}
              </div>

              <div className="flex-1" />

              {/* Cancel on step 1, Save & Next / Finish on others */}
              {wizardStep === 1 && (
                <button onClick={closeDrawer}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
              )}

              {wizardStep === 1 && (
                <button onClick={saveBasicInfo} disabled={saving || !form.full_name.trim() || !form.email.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save &amp; Next <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {wizardStep === 2 && (
                <>
                  <button onClick={() => setWizardStep(3)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Skip
                  </button>
                  <button onClick={saveEmployment} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save &amp; Next <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <button onClick={() => setWizardStep(4)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Skip
                  </button>
                  <button onClick={savePosition} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {form.positionId ? <>Save &amp; Next <ChevronRight className="h-4 w-4" /></> : <>Next <ChevronRight className="h-4 w-4" /></>}
                  </button>
                </>
              )}

              {wizardStep === 4 && (
                <button onClick={() => setWizardStep(5)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {wizardStep === 5 && (
                <>
                  <button onClick={() => { void load(); closeDrawer(); }}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Skip &amp; Finish
                  </button>
                  <button onClick={saveEducation} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="h-4 w-4" /> {eduEntries.length > 0 ? `Save ${eduEntries.length} Record${eduEntries.length > 1 ? "s" : ""} & Finish` : "Finish"}
                  </button>
                </>
              )}
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

      {timelineEmployee && (
        <CareerTimeline
          employeeId={timelineEmployee.id}
          employeeName={timelineEmployee.full_name}
          profileImageUrl={timelineEmployee.profile_image_url}
          isAdmin={true}
          onClose={() => setTimelineEmployee(null)}
        />
      )}

      {/* Extend probation/contract modal */}
      {extendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setExtendModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Extend {extendModal.type === "probation" ? "Probation" : "Contract"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{extendModal.emp.full_name}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New End Date <span className="text-red-500">*</span></label>
              <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)} className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
              <textarea value={extendReason} onChange={e => setExtendReason(e.target.value)} className="field min-h-20" placeholder="Reason for extension…" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExtendModal(null)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button disabled={!extendDate || extending}
                onClick={async () => {
                  if (!extendDate) return;
                  setExtending(true);
                  try {
                    const payload = { new_end_date: new Date(extendDate).toISOString(), reason: extendReason };
                    if (extendModal.type === "probation") {
                      await apiClient.employee.extendProbation(extendModal.emp.id, payload);
                    } else {
                      await apiClient.employee.extendContract(extendModal.emp.id, payload);
                    }
                    toast.success("Extended", `${extendModal.type} extended to ${new Date(extendDate).toLocaleDateString()}`);
                    setExtendModal(null);
                    await load();
                  } catch (err) {
                    toast.error("Failed", err instanceof Error ? err.message : "Failed");
                  } finally { setExtending(false); }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
                {extending && <Loader2 className="h-4 w-4 animate-spin" />}
                Extend
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Exit modal */}
      {exitEmployee && (
        <ExitFormModal
          employee={{
            id:               exitEmployee.id,
            full_name:        exitEmployee.full_name,
            employment_type:  exitEmployee.employment_type,
            position_title:   undefined,
          }}
          onSuccess={() => { setExitEmployee(null); void load(); }}
          onClose={() => setExitEmployee(null)}
        />
      )}
    </section>
  );
}
