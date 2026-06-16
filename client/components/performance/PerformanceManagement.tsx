"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Star, Plus, X, Loader2, Trash2, Search,
  ChevronDown, ChevronUp, CheckCircle2, Clock,
  TrendingUp, Users, Award, AlertTriangle, Pencil,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";

// ── Rating config ──────────────────────────────────────────────────────────────
const RATINGS = [
  { value: 5, label: "Outstanding",              color: "bg-emerald-500",  light: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
  { value: 4, label: "Exceeded Expectations",    color: "bg-cyan-500",     light: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800" },
  { value: 3, label: "Succeeded",                color: "bg-blue-500",     light: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { value: 2, label: "Meets Some Expectations",  color: "bg-amber-500",    light: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  { value: 1, label: "Unsatisfactory",           color: "bg-red-500",      light: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
];

const CYCLES = [
  { value: "mid_year", label: "Mid-Year Review",    desc: "June / July" },
  { value: "end_year", label: "End of Year Review", desc: "December / January" },
];

function getRating(v: number | null) {
  return RATINGS.find(r => r.value === v) ?? null;
}

// ── Star rating picker ─────────────────────────────────────────────────────────
function StarPicker({ value, onChange, disabled }: {
  value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50">
          <Star className={cn("h-6 w-6 transition-colors",
            (hover || value) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
          )} />
        </button>
      ))}
      {value > 0 && (
        <span className={cn("ml-2 self-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", getRating(value)?.light)}>
          {getRating(value)?.label}
        </span>
      )}
    </div>
  );
}

// ── Rating badge ───────────────────────────────────────────────────────────────
function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-slate-400">—</span>;
  const r = getRating(rating)!;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", r.light)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", r.color)} />
      {rating} — {r.label}
    </span>
  );
}

// ── Review Form (create / edit) ────────────────────────────────────────────────
interface GoalDraft {
  id?: string; title: string; description: string; weight: number;
  rating: number; comments: string;
}

function ReviewForm({ employee, existingReview, year, onSuccess, onClose }: {
  employee: any; existingReview?: any; year: number;
  onSuccess: () => void; onClose: () => void;
}) {
  const [cycle,    setCycle]    = useState(existingReview?.cycle ?? "mid_year");
  const [rating,   setRating]   = useState<number>(existingReview?.rating ?? 0);
  const [comments, setComments] = useState(existingReview?.comments ?? "");
  const [goals,    setGoals]    = useState<GoalDraft[]>(
    existingReview?.goals?.map((g: any) => ({
      id: g.id, title: g.title, description: g.description ?? "",
      weight: g.weight, rating: g.rating ?? 0, comments: g.comments ?? "",
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const toast = useToast();

  const totalWeight = goals.reduce((s, g) => s + (g.weight || 0), 0);

  const addGoal = () => setGoals(gs => [...gs, { title: "", description: "", weight: 20, rating: 0, comments: "" }]);
  const removeGoal = (i: number) => setGoals(gs => gs.filter((_, idx) => idx !== i));
  const updateGoal = (i: number, field: keyof GoalDraft, val: any) =>
    setGoals(gs => gs.map((g, idx) => idx === i ? { ...g, [field]: val } : g));

  const submit = async (isDraft: boolean) => {
    if (!rating) { setError("Please select an overall rating."); return; }
    if (goals.length > 0 && totalWeight !== 100) {
      setError(`Goal weights must sum to 100 (currently ${totalWeight}).`); return;
    }
    setSaving(true); setError("");
    try {
      const goalPayloads = goals
        .filter(g => g.title.trim())
        .map(g => ({
          title: g.title.trim(), description: g.description.trim() || undefined,
          weight: g.weight, rating: g.rating || undefined,
          comments: g.comments.trim() || undefined,
        }));

      if (existingReview) {
        // Update overall rating/comments/draft status
        await apiClient.performance.updateReview(existingReview.id, {
          rating, comments: comments.trim() || undefined, is_draft: isDraft,
        });
        // Replace all goals: delete old ones then add new ones
        for (const og of existingReview.goals ?? []) {
          await apiClient.performance.deleteGoal(og.id);
        }
        for (const gp of goalPayloads) {
          await apiClient.performance.addGoal(existingReview.id, gp);
        }
      } else {
        // Create the review — always starts as draft in backend
        const created = await apiClient.performance.createReview({
          employee_id: employee.employee_id, year, cycle,
          rating, comments: comments.trim() || undefined, goals: goalPayloads,
        });
        // If admin clicked Finalise (not Save Draft), immediately update is_draft to false
        if (!isDraft && created?.id) {
          await apiClient.performance.updateReview(created.id, { is_draft: false });
        }
      }

      toast.success(
        isDraft ? "Saved as draft" : "Review finalised",
        `${employee.employee_name}'s review saved.`
      );
      onSuccess();
    } catch (e: any) { setError(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}>
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {existingReview ? "Edit" : "New"} Performance Review
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{employee.employee_name} · {year}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Cycle */}
          {!existingReview && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Review Cycle <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {CYCLES.map(c => (
                  <label key={c.value} className={cn(
                    "flex flex-col rounded-xl border-2 px-4 py-3 cursor-pointer transition-all",
                    cycle === c.value ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  )}>
                    <input type="radio" name="cycle" value={c.value} checked={cycle === c.value}
                      onChange={() => setCycle(c.value)} className="sr-only" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{c.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Overall rating */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Overall Rating <span className="text-red-500">*</span></label>
            <StarPicker value={rating} onChange={setRating} />
            <div className="mt-3 grid grid-cols-1 gap-1.5">
              {RATINGS.map(r => (
                <button key={r.value} type="button" onClick={() => setRating(r.value)}
                  className={cn("flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-all",
                    rating === r.value ? `${r.light} border-current` : "border-slate-200 dark:border-slate-700 hover:border-slate-300")}>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold", r.color)}>{r.value}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Overall Comments</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)}
              className="field min-h-20" placeholder="General performance feedback, achievements, areas for improvement…" />
          </div>

          {/* Goals / KPIs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                KPI Goals
                <span className="ml-2 text-xs text-slate-400 font-normal">(weights must sum to 100)</span>
              </label>
              <div className="flex items-center gap-2">
                {goals.length > 0 && (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                    totalWeight === 100 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                       : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300")}>
                    {totalWeight}% / 100%
                  </span>
                )}
                <button type="button" onClick={addGoal}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <Plus className="h-3 w-3" /> Add Goal
                </button>
              </div>
            </div>
            {goals.map((g, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Goal {i + 1}</span>
                  <button type="button" onClick={() => removeGoal(i)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_80px]">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Title <span className="text-red-500">*</span></label>
                    <input value={g.title} onChange={e => updateGoal(i, "title", e.target.value)}
                      className="field" placeholder="e.g. Customer Satisfaction, Revenue Target" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Weight %</label>
                    <input type="number" min={1} max={100} value={g.weight}
                      onChange={e => updateGoal(i, "weight", Number(e.target.value))}
                      className="field" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Goal Rating</label>
                  <StarPicker value={g.rating} onChange={v => updateGoal(i, "rating", v)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Comments</label>
                  <input value={g.comments} onChange={e => updateGoal(i, "comments", e.target.value)}
                    className="field" placeholder="Goal-specific feedback" />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={() => submit(true)} disabled={saving || !rating}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft
          </button>
          <button onClick={() => submit(false)} disabled={saving || !rating}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Finalise
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employee Review Detail Modal ────────────────────────────────────────────────
function EmployeeReviewModal({ employee, year, onClose, onRefresh }: {
  employee: any; year: number; onClose: () => void; onRefresh: () => void;
}) {
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editReview, setEditReview] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]     = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiClient.performance.getEmployeeReviews(employee.employee_id, year)); }
    catch (e: any) { toast.error("Load failed", e?.message); }
    finally { setLoading(false); }
  }, [employee.employee_id, year]);

  useEffect(() => { void load(); }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.performance.deleteReview(deleteTarget.id);
      toast.success("Deleted", "Draft review deleted.");
      setDeleteTarget(null);
      await load(); onRefresh();
    } catch (e: any) { toast.error("Failed", e?.message); }
    finally { setDeleting(false); }
  };

  const initials = employee.employee_name.split(" ").slice(0,2).map((w: string) => w[0]).join("").toUpperCase();

  // Which cycles are already reviewed
  const existingCycles = new Set(data?.reviews?.map((r: any) => r.cycle) ?? []);
  const availableCycles = CYCLES.filter(c => !existingCycles.has(c.value));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}>
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white">{initials}</div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{employee.employee_name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Performance Reviews · {year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {availableCycles.length > 0 && (
              <button onClick={() => { setEditReview(null); setShowForm(true); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Review
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : data?.reviews?.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-12 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No reviews yet for {year}.</p>
            </div>
          ) : (
            data?.reviews?.map((review: any) => (
              <div key={review.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
                {/* Review header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{review.cycle_label}</span>
                    {review.is_draft ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                        <Clock className="h-2.5 w-2.5" /> Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Final
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setEditReview(review); setShowForm(true); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {review.is_draft && (
                      <button onClick={() => setDeleteTarget(review)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {/* Overall rating */}
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={cn("h-5 w-5", review.rating >= n ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700")} />
                      ))}
                    </div>
                    <RatingBadge rating={review.rating} />
                  </div>

                  {review.comments && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">"{review.comments}"</p>
                  )}

                  {/* Goals */}
                  {review.goals?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">KPI Goals</p>
                      {review.goals.map((g: any) => (
                        <div key={g.id} className="flex items-start justify-between rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{g.title}</span>
                              <span className="text-[10px] font-semibold text-slate-400">{g.weight}%</span>
                            </div>
                            {g.comments && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{g.comments}</p>}
                          </div>
                          <RatingBadge rating={g.rating} />
                        </div>
                      ))}
                    </div>
                  )}

                  {review.reviewed_by && (
                    <p className="text-[10px] text-slate-400">
                      Reviewed by {review.reviewed_by}
                      {review.reviewed_at && ` · ${new Date(review.reviewed_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}`}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <ReviewForm
          employee={employee} year={year}
          existingReview={editReview}
          onSuccess={() => { setShowForm(false); setEditReview(null); void load(); onRefresh(); }}
          onClose={() => { setShowForm(false); setEditReview(null); }}
        />
      )}

      <DeleteModal open={!!deleteTarget} title="Delete Draft Review"
        description="This draft review will be permanently deleted."
        itemName={deleteTarget ? `${review_cycle_label(deleteTarget.cycle)} ${year}` : ""}
        loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function review_cycle_label(cycle: string) {
  return cycle === "mid_year" ? "Mid-Year" : "End of Year";
}

// ── Main Performance Management Dashboard ──────────────────────────────────────
export default function PerformanceManagement() {
  const [summary, setSummary]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [year, setYear]           = useState(new Date().getFullYear());
  const [cycle, setCycle]         = useState<string>("");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<any | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setSummary(await apiClient.performance.getSummary(year, cycle || undefined)); }
    catch (e: any) { toast.error("Load failed", e?.message); }
    finally { setLoading(false); }
  }, [year, cycle]);

  useEffect(() => { void load(); }, [load]);

  const employees = useMemo(() =>
    (summary?.employees ?? []).filter((e: any) =>
      !search.trim() || e.employee_name.toLowerCase().includes(search.toLowerCase())
    ), [summary, search]);

  const ratingDist = useMemo(() => {
    const counts: Record<number, number> = { 5:0, 4:0, 3:0, 2:0, 1:0 };
    (summary?.employees ?? []).forEach((e: any) =>
      e.reviews?.forEach((r: any) => { if (!r.is_draft) counts[r.rating] = (counts[r.rating]||0)+1; })
    );
    return counts;
  }, [summary]);

  const totalFinalised = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  return (
    <section className="min-w-0 space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Performance Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bi-annual employee performance reviews — Mid-Year & End of Year
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={cycle} onChange={e => setCycle(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <option value="">All cycles</option>
            {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Employees", value: summary?.total_employees ?? 0, icon: Users,       color: "text-slate-600 dark:text-slate-300",  bg: "bg-slate-100 dark:bg-slate-800" },
          { label: "Reviewed",        value: summary?.reviewed ?? 0,        icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Pending",         value: summary?.pending ?? 0,         icon: Clock,        color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Avg Rating",      value: summary?.average_rating ? `${summary.average_rating} / 5` : "—", icon: Star, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", kpi.bg)}>
                <Icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating distribution */}
      {totalFinalised > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Rating Distribution</p>
          <div className="space-y-2">
            {RATINGS.map(r => {
              const count = ratingDist[r.value] || 0;
              const pct   = totalFinalised > 0 ? Math.round((count / totalFinalised) * 100) : 0;
              return (
                <div key={r.value} className="flex items-center gap-3">
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold", r.color)}>{r.value}</span>
                  <span className="w-36 text-xs text-slate-600 dark:text-slate-400 truncate">{r.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", r.color)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employees…" className="field pl-9 pr-9" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
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
            <Award className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No employees found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  {["Employee","Mid-Year","End of Year","Status","Action"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp: any) => {
                  const midYear = emp.reviews?.find((r: any) => r.cycle === "mid_year");
                  const endYear = emp.reviews?.find((r: any) => r.cycle === "end_year");
                  const bothDone = midYear && !midYear.is_draft && endYear && !endYear.is_draft;
                  const noneYet  = !midYear && !endYear;
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
                        {midYear
                          ? <RatingBadge rating={midYear.rating} />
                          : <span className="text-xs text-slate-400 italic">Pending</span>}
                        {midYear?.is_draft && <span className="ml-1 text-[10px] text-amber-500">(draft)</span>}
                      </td>
                      <td className="px-5 py-3">
                        {endYear
                          ? <RatingBadge rating={endYear.rating} />
                          : <span className="text-xs text-slate-400 italic">Pending</span>}
                        {endYear?.is_draft && <span className="ml-1 text-[10px] text-amber-500">(draft)</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          bothDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : noneYet ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300")}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {bothDone ? "Complete" : noneYet ? "Not Started" : "In Progress"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => setSelected(emp)}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-300 transition-colors">
                          <TrendingUp className="h-3 w-3" /> Review
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
        <EmployeeReviewModal
          employee={selected} year={year}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </section>
  );
}
