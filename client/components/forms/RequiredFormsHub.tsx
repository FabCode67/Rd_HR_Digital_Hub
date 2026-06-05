"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { FormAnswerInput, FormField, FormStatus } from "@/lib/types";
import SignaturePad from "./SignaturePad";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  FileSignature,
  Loader2,
  ShieldAlert,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFieldValue(values: Record<string, string>, field: FormField): string {
  return values[field.id] ?? (field.field_type === "checkbox" ? "false" : "");
}

function isSignatureField(field: FormField): boolean {
  const n = field.field_name.toLowerCase();
  const l = field.field_label.toLowerCase();
  return (
    n.includes("signature") ||
    n.includes("sign") ||
    l.includes("signature") ||
    l.includes("sign here")
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RequiredFormsHub() {
  const { user, isLoading: authLoading } = useAuth();
  const [forms, setForms]                 = useState<FormStatus[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [values, setValues]               = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading]         = useState(true);
  const [submittingFormId, setSubmittingFormId] = useState<string>("");
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");

  const selectedForm = useMemo(
    () => forms.find((item) => item.form.id === selectedFormId) ?? forms[0] ?? null,
    [forms, selectedFormId]
  );

  const loadForms = async (keepSelected?: string) => {
    const payload = await apiClient.form.getMyRequiredForms();
    setForms(payload);
    setSelectedFormId(keepSelected || payload[0]?.form.id || "");
    setValues((prev) => {
      const next = { ...prev };
      payload.forEach((item) => {
        if (!next[item.form.id]) {
          next[item.form.id] = {};
          item.form.fields?.forEach((field) => {
            next[item.form.id][field.id] = field.field_type === "checkbox" ? "false" : "";
          });
        }
      });
      return next;
    });
  };

  useEffect(() => {
    if (!authLoading && user) {
      setIsLoading(true);
      loadForms()
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load forms"))
        .finally(() => setIsLoading(false));
    }
  }, [authLoading, user]);

  // Ensure new fields get default values when switching forms
  useEffect(() => {
    if (selectedForm?.form.fields) {
      setValues((current) => {
        const next = { ...current };
        const fv = { ...(next[selectedForm.form.id] || {}) };
        selectedForm.form.fields!.forEach((field) => {
          if (fv[field.id] === undefined) {
            fv[field.id] = field.field_type === "checkbox" ? "false" : "";
          }
        });
        next[selectedForm.form.id] = fv;
        return next;
      });
    }
  }, [selectedForm]);

  const completedCount  = forms.filter((f) => f.is_completed).length;
  const incompleteCount = forms.length - completedCount;

  const handleSubmit = async (event: React.FormEvent, formStatus: FormStatus) => {
    event.preventDefault();
    const fv = values[formStatus.form.id] || {};

    if ((formStatus.form.fields || []).some(
      (f) => f.is_required && isSignatureField(f) && !fv[f.id]
    )) {
      setError("Please provide your signature before submitting.");
      return;
    }
    if ((formStatus.form.fields || []).some(
      (f) => f.is_required && f.field_type === "checkbox" && fv[f.id] !== "true"
    )) {
      setError("Please check all required boxes before submitting.");
      return;
    }

    setSubmittingFormId(formStatus.form.id);
    setError("");
    setSuccess("");

    try {
      const answers: FormAnswerInput[] = (formStatus.form.fields || []).map((field) => ({
        field_id: field.id,
        value:
          field.field_type === "checkbox"
            ? fv[field.id] === "true" ? "true" : "false"
            : fv[field.id] || "",
      }));
      await apiClient.form.submitMyForm(formStatus.form.id, answers);
      setSuccess(`"${formStatus.form.name}" submitted successfully.`);
      await loadForms(formStatus.form.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setSubmittingFormId("");
    }
  };

  const markCard = (item: FormStatus) =>
    item.is_completed
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
      : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-slate-800";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <section className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Hero header */}
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6 sm:p-8 space-y-4">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-400">
                  Staff Forms
                </p>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Your assigned forms
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {user?.full_name || user?.email || "You"} — complete all pending forms below. Select a form on the left to review and submit.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Assigned</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{forms.length}</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Completed</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">{completedCount}</div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="text-xs uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Pending</div>
                    <div className="mt-1 text-2xl font-semibold text-amber-900 dark:text-amber-100">{incompleteCount}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <FileSignature className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    How it works
                  </div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Select a form, read the instructions, fill in the required fields, then submit your acknowledgement.
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Completed forms are locked. Contact HR if you need to make a change after submission.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" /> Loading your forms…
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <FileSignature className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No forms assigned yet</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Check back later or contact HR if you think something is missing.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">

              {/* ── Form list ── */}
              <div className="space-y-3">
                {forms.map((item) => (
                  <button
                    key={item.form.id}
                    type="button"
                    onClick={() => {
                      setSelectedFormId(item.form.id);
                      setError("");
                      setSuccess("");
                    }}
                    className={`w-full rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${markCard(item)} ${
                      selectedForm?.form.id === item.form.id ? "ring-2 ring-cyan-400/60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileSignature className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.form.name}
                          </h2>
                        </div>
                        {item.form.description && (
                          <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                            {item.form.description.replace(/<[^>]*>/g, "").slice(0, 160)}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        item.is_completed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        {item.is_completed ? "Done" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {item.is_completed
                        ? <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        : <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                      {item.is_completed ? "Submitted and recorded" : "Awaiting your acknowledgement"}
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Form detail ── */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {selectedForm ? (
                  <form onSubmit={(e) => void handleSubmit(e, selectedForm)} className="space-y-8">

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                          {selectedForm.form.name}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Fill in the fields below and submit your acknowledgement.
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                        selectedForm.is_completed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        {selectedForm.is_completed ? "Completed" : "Pending"}
                      </span>
                    </div>

                    {/* Description from admin rich-text editor */}
                    {selectedForm.form.description && (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none rounded-3xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40"
                        dangerouslySetInnerHTML={{ __html: selectedForm.form.description }}
                      />
                    )}

                    {/* Fields — collapsed read-only summary when completed, editable when pending */}
                    {selectedForm.form.fields?.length ? (
                      selectedForm.is_completed ? (
                        // ── Read-only summary (completed) ──
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Your submitted answers</span>
                            {selectedForm.submitted_at && (
                              <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">
                                {new Date(selectedForm.submitted_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="grid gap-4 p-4 sm:grid-cols-2">
                            {selectedForm.form.fields.map((field) => {
                              const val = getFieldValue(values[selectedForm.form.id] || {}, field);
                              return (
                                <div key={field.id} className="space-y-1">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {field.field_label}
                                  </p>
                                  {field.field_type === 'signature' ||
                                  field.field_name.toLowerCase().includes('sign') ? (
                                    val && val.startsWith('data:image') ? (
                                      <img src={val} alt="Signature"
                                        className="max-h-16 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
                                    ) : <span className="text-xs italic text-slate-400">—</span>
                                  ) : field.field_type === 'checkbox' ? (
                                    val === 'true'
                                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Confirmed</span>
                                      : <span className="text-xs italic text-slate-400">Not confirmed</span>
                                  ) : (
                                    <span className="text-sm text-slate-800 dark:text-slate-200 break-words">
                                      {val || <span className="italic text-slate-400">—</span>}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        // ── Editable fields (pending) ──
                        <div className="space-y-4">
                          {selectedForm.form.fields.map((field) => {
                            const fieldValue = getFieldValue(values[selectedForm.form.id] || {}, field);
                            return (
                              <div key={field.id} className="space-y-1.5">
                                {field.field_type === "checkbox" ? (
                                  <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                                    <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                                      <input
                                        type="checkbox"
                                        checked={fieldValue === "true"}
                                        onChange={(e) =>
                                          setValues((c) => ({
                                            ...c,
                                            [selectedForm.form.id]: {
                                              ...(c[selectedForm.form.id] || {}),
                                              [field.id]: e.target.checked ? "true" : "false",
                                            },
                                          }))
                                        }
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                      />
                                      <span>
                                        {field.field_label}
                                        {field.is_required && <span className="ml-1 text-red-500">*</span>}
                                      </span>
                                    </label>
                                  </div>
                                ) : isSignatureField(field) ? (
                                  <SignaturePad
                                    label={field.field_label}
                                    required={field.is_required}
                                    value={fieldValue}
                                    onChange={(dataURL) =>
                                      setValues((c) => ({
                                        ...c,
                                        [selectedForm.form.id]: {
                                          ...(c[selectedForm.form.id] || {}),
                                          [field.id]: dataURL,
                                        },
                                      }))
                                    }
                                  />
                                ) : (
                                  <>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                      {field.field_label}
                                      {field.is_required && <span className="ml-1 text-red-500">*</span>}
                                    </label>
                                    {field.field_type === "textarea" ? (
                                      <textarea
                                        value={fieldValue}
                                        onChange={(e) =>
                                          setValues((c) => ({
                                            ...c,
                                            [selectedForm.form.id]: {
                                              ...(c[selectedForm.form.id] || {}),
                                              [field.id]: e.target.value,
                                            },
                                          }))
                                        }
                                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:text-slate-100"
                                      />
                                    ) : (
                                      <input
                                        type={
                                          field.field_type === "number" ? "number"
                                          : field.field_type === "date" ? "date"
                                          : field.field_type === "email" ? "email"
                                          : field.field_type === "phone" ? "tel"
                                          : "text"
                                        }
                                        value={fieldValue}
                                        onChange={(e) =>
                                          setValues((c) => ({
                                            ...c,
                                            [selectedForm.form.id]: {
                                              ...(c[selectedForm.form.id] || {}),
                                              [field.id]: e.target.value,
                                            },
                                          }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:text-slate-100"
                                      />
                                    )}
                                  </>
                                )}
                                {field.help_text && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{field.help_text}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                        This form has no fields — submit to acknowledge you have read the above.
                      </div>
                    )}

                    {/* Submit */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="submit"
                        disabled={submittingFormId === selectedForm.form.id || selectedForm.is_completed}
                      >
                        {submittingFormId === selectedForm.form.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                        ) : selectedForm.is_completed ? (
                          "Already submitted"
                        ) : (
                          <>Submit <ChevronRight className="ml-2 h-4 w-4" /></>
                        )}
                      </Button>
                      {selectedForm.submitted_at && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Submitted {new Date(selectedForm.submitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                  </form>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Select a form to begin.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </ProtectedRoute>
  );
}
