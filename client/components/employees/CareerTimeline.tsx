"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  Briefcase, Building2, Loader2, TrendingUp, Calendar, Award,
  X, Clock, GraduationCap, Plus, Pencil, Trash2, ExternalLink,
  FileText, BookOpen, Wrench, BadgeCheck, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  position_title: string;
  position_level: string;
  position_band: string | null;
  department_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  duration_days: number | null;
}

interface EducationRecord {
  id: string;
  record_type: string;
  title: string;
  institution: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  certificate_url: string | null;
  grade: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  Director:            "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Head:                "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Manager:             "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Senior Manager":    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Assistant Manager": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Officer:             "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Graduate Trainee":  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Intern:              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const RECORD_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  degree:        { label: "Degree",        icon: GraduationCap, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  certification: { label: "Certification", icon: BadgeCheck,    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  training:      { label: "Training",      icon: Wrench,        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  course:        { label: "Course",        icon: BookOpen,      color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function fmtDuration(days: number | null): string {
  if (days === null || days < 0) return "";
  if (days < 30)  return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const yr = Math.floor(days / 365);
  const mo = Math.floor((days % 365) / 30);
  return mo > 0 ? `${yr}yr ${mo}mo` : `${yr}yr`;
}

// ── Education form ─────────────────────────────────────────────────────────────

const emptyEdu = {
  record_type: "degree", title: "", institution: "", description: "",
  start_date: "", end_date: "", is_current: false, grade: "",
};

function EducationForm({ initial, onSave, onCancel, saving }: {
  initial: typeof emptyEdu;
  onSave: (data: typeof emptyEdu) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Type *</label>
          <select value={form.record_type} onChange={e => set("record_type", e.target.value)} className="field">
            <option value="degree">Degree</option>
            <option value="certification">Certification</option>
            <option value="training">Training</option>
            <option value="course">Course</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Title *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} className="field" placeholder="e.g. BSc Computer Science" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Institution</label>
          <input value={form.institution} onChange={e => set("institution", e.target.value)} className="field" placeholder="University / Organization" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Grade / Score</label>
          <input value={form.grade} onChange={e => set("grade", e.target.value)} className="field" placeholder="e.g. Distinction, A, 85%" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
          <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="field" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">End Date</label>
          <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="field" disabled={form.is_current} />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_current} onChange={e => set("is_current", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600" />
            Currently ongoing
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Description</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            className="field min-h-16" placeholder="Optional — key learnings, modules, etc." />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Certificate uploader ───────────────────────────────────────────────────────

function CertificateUploader({ recordId, token, existingUrl, onUploaded }: {
  recordId: string; token: string; existingUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const res = await apiClient.education.uploadCertificate(recordId, file, token);
      onUploaded(res.certificate_url);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {existingUrl && (
        <a href={existingUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors">
          <FileText className="h-3 w-3" /> View Certificate <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors">
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {existingUrl ? "Replace" : "Upload Certificate"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
      <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={handle} />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CareerTimelineProps {
  employeeId: string;
  employeeName: string;
  profileImageUrl?: string | null;
  isAdmin?: boolean;
  isSelf?: boolean;        // true when staff views their OWN career
  token?: string | null;
  onClose?: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CareerTimeline({
  employeeId, employeeName, profileImageUrl,
  isAdmin = false, isSelf = false, token, onClose,
}: CareerTimelineProps) {
  const [tab, setTab]           = useState<"positions" | "education">("positions");
  const [posData, setPosData]   = useState<any | null>(null);
  const [eduData, setEduData]   = useState<EducationRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Education CRUD state
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const initials = employeeName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [pos, edu] = await Promise.all([
        apiClient.employee.getCareerTimeline(employeeId),
        // Staff viewing their own: use /me endpoint (no ID comparison on server)
        // Admin or staff viewing others: use /employee/{id} endpoint
        isSelf
          ? apiClient.education.getMyRecords()
          : apiClient.education.getRecords(employeeId),
      ]);
      setPosData(pos);
      setEduData(edu);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [employeeId]);

  const saveEdu = async (data: typeof emptyEdu, id?: string) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date && !data.is_current ? new Date(data.end_date).toISOString() : null,
        institution: data.institution || null,
        description: data.description || null,
        grade: data.grade || null,
      };
      if (id) {
        await apiClient.education.update(id, payload);
      } else if (isSelf) {
        await apiClient.education.createMyRecord(payload);
      } else {
        await apiClient.education.create(employeeId, payload);
      }
      setAdding(false); setEditId(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteEdu = async (id: string) => {
    setDeleteId(id);
    try {
      await apiClient.education.delete(id);
      await load();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  // ── Inner content ──────────────────────────────────────────────────────────

  const content = (
    <div className={cn(
      "flex flex-col",
      onClose ? "h-full" : "min-h-0"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={employeeName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{employeeName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Career & Education
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 shrink-0">
        {(["positions", "education"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "py-3 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}>
            {t === "positions" ? (
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Position History</span>
            ) : (
              <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Education & Training</span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : tab === "positions" ? (

          /* ── Position History tab ── */
          posData?.timeline?.length ? (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-0">
                {posData.timeline.map((entry: TimelineEntry) => (
                  <div key={entry.id} className="relative flex gap-5 pb-6 last:pb-0">
                    <div className="relative z-10 flex-shrink-0">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm",
                        entry.is_current
                          ? "border-cyan-400 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-950/40"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                      )}>
                        <Briefcase className={cn("h-4 w-4", entry.is_current ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400")} />
                      </div>
                    </div>
                    <div className={cn(
                      "flex-1 rounded-xl border p-4",
                      entry.is_current
                        ? "border-cyan-200 bg-cyan-50/60 dark:border-cyan-800 dark:bg-cyan-950/20"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                    )}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.position_title || "Unknown"}</h3>
                            {entry.is_current && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" /> Current
                              </span>
                            )}
                          </div>
                          {entry.department_name && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <Building2 className="h-3 w-3 shrink-0" /> {entry.department_name}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {entry.position_level && (
                              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                LEVEL_COLORS[entry.position_level] ?? LEVEL_COLORS.Officer)}>
                                <Award className="mr-1 h-2.5 w-2.5" /> {entry.position_level}
                              </span>
                            )}
                            {entry.position_band && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                Band {entry.position_band}
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.duration_days !== null && (
                          <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 shrink-0">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{fmtDuration(entry.duration_days)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {fmtDate(entry.start_date)}
                        <span className="text-slate-300 dark:text-slate-600">→</span>
                        {entry.is_current
                          ? <span className="text-cyan-600 dark:text-cyan-400 font-medium">Present</span>
                          : fmtDate(entry.end_date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No position history yet</p>
              {isAdmin && <p className="text-xs text-slate-400 mt-1">Use the Position modal on the Employees page to assign positions.</p>}
            </div>
          )

        ) : (

          /* ── Education & Training tab ── */
          <div className="space-y-4">
            {/* Add button — staff and admin can add */}
            {!adding && (
              <button onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:border-cyan-600 dark:hover:text-cyan-400 transition-colors w-full justify-center">
                <Plus className="h-4 w-4" /> Add Education / Training
              </button>
            )}

            {/* Add form */}
            {adding && (
              <EducationForm
                initial={{ ...emptyEdu }}
                onSave={data => void saveEdu(data)}
                onCancel={() => setAdding(false)}
                saving={saving}
              />
            )}

            {/* Records list */}
            {eduData.length === 0 && !adding ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No education records yet</p>
                <p className="text-xs text-slate-400 mt-1">Add your degrees, certifications and training courses.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-0">
                  {eduData.map(rec => {
                    const meta = RECORD_TYPE_META[rec.record_type] ?? RECORD_TYPE_META.course;
                    const Icon = meta.icon;
                    const isEditing = editId === rec.id;
                    return (
                      <div key={rec.id} className="relative flex gap-5 pb-6 last:pb-0">
                        {/* Node */}
                        <div className="relative z-10 shrink-0">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm bg-white dark:bg-slate-800",
                            rec.is_current ? "border-violet-400 dark:border-violet-500" : "border-slate-300 dark:border-slate-600"
                          )}>
                            <Icon className={cn("h-4 w-4", rec.is_current ? "text-violet-600 dark:text-violet-400" : "text-slate-400")} />
                          </div>
                        </div>

                        {/* Card */}
                        <div className="flex-1">
                          {isEditing ? (
                            <EducationForm
                              initial={{
                                record_type: rec.record_type,
                                title: rec.title,
                                institution: rec.institution ?? "",
                                description: rec.description ?? "",
                                start_date: rec.start_date ? rec.start_date.slice(0, 10) : "",
                                end_date: rec.end_date ? rec.end_date.slice(0, 10) : "",
                                is_current: rec.is_current,
                                grade: rec.grade ?? "",
                              }}
                              onSave={data => void saveEdu(data, rec.id)}
                              onCancel={() => setEditId(null)}
                              saving={saving}
                            />
                          ) : (
                            <div className={cn(
                              "rounded-xl border p-4",
                              rec.is_current
                                ? "border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/20"
                                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                            )}>
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{rec.title}</h3>
                                    {rec.is_current && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" /> Ongoing
                                      </span>
                                    )}
                                  </div>
                                  {rec.institution && (
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{rec.institution}</p>
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
                                      <Icon className="mr-1 h-2.5 w-2.5" /> {meta.label}
                                    </span>
                                    {rec.grade && (
                                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                        {rec.grade}
                                      </span>
                                    )}
                                  </div>
                                  {rec.description && (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rec.description}</p>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    {fmtDate(rec.start_date)}
                                    <span>→</span>
                                    {rec.is_current ? <span className="text-violet-600 dark:text-violet-400 font-medium">Present</span> : fmtDate(rec.end_date)}
                                  </div>

                                  {/* Certificate */}
                                  {token && !isAdmin && (
                                    <CertificateUploader
                                      recordId={rec.id}
                                      token={token}
                                      existingUrl={rec.certificate_url}
                                      onUploaded={url => {
                                        setEduData(prev => prev.map(r => r.id === rec.id ? { ...r, certificate_url: url } : r));
                                      }}
                                    />
                                  )}
                                  {isAdmin && rec.certificate_url && (
                                    <a href={rec.certificate_url} target="_blank" rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors">
                                      <FileText className="h-3 w-3" /> View Certificate <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>

                                {/* Actions — not admin-only: staff can edit/delete own */}
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => setEditId(rec.id)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => void deleteEdu(rec.id)} disabled={deleteId === rec.id}
                                    className="rounded-lg border border-red-200 dark:border-red-800 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60 transition-colors">
                                    {deleteId === rec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && posData && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-3 bg-slate-50 dark:bg-slate-950/40 rounded-b-2xl shrink-0">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              {posData.total_entries} position{posData.total_entries !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              {eduData.length} education record{eduData.length !== 1 ? "s" : ""}
            </span>
            {posData.timeline?.length > 0 && (() => {
              const totalDays = posData.timeline.reduce((s: number, e: TimelineEntry) => s + (e.duration_days ?? 0), 0);
              return totalDays > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {fmtDuration(totalDays)} tenure
                </span>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );

  // Render as modal or inline
  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col"
          onClick={e => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {content}
    </div>
  );
}
