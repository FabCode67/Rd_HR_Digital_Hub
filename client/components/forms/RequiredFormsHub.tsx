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

type FormCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  accent: string;
  sections: Array<{
    heading: string;
    body: string[];
    bullets?: string[];
  }>;
  completionNote: string;
};

const TARGET_FORM_NAMES = [
  "BACKGROUND/REFERENCE CHECKS CONSENT FORM",
  "EMPLOYEE CONDUCT PLEDGE",
  "STATEMENT OF INFORMATION PROCESSING RESPONSIBILITIES FOR ALL BANK STAFF",
] as const;

const FORM_COPY: Record<(typeof TARGET_FORM_NAMES)[number], FormCopy> = {
  "BACKGROUND/REFERENCE CHECKS CONSENT FORM": {
    eyebrow: "Pre-employment screening",
    title: "BACKGROUND/REFERENCE CHECKS CONSENT FORM",
    summary:
      "NCBA may verify identity, academic history, employment history, criminal records, credit worthiness, and professional references before making a hiring decision.",
    accent: "from-cyan-500 to-sky-500",
    sections: [
      {
        heading: "Introduction",
        body: [
          "NCBA Group Plc, including direct and indirect subsidiaries (NCBA), respects your privacy and is committed to protecting your personal data and ensuring that it is collected and used in a proper and lawful manner.",
          "As part of our standard hiring process, we may conduct background checks and/or contact your references for the purposes described in this form. Explicit consent is required before these checks can proceed.",
        ],
      },
      {
        heading: "Background Checks",
        body: [
          "NCBA and/or its appointed agents may conduct background checks relevant to the position for which you have applied.",
        ],
        bullets: [
          "Personal identification documents - verifying authenticity to prevent identity theft and fraud.",
          "Academic documents - verifying academic credentials and maintaining the integrity of educational records.",
          "Employment history - confirming employment history is accurate and truthful.",
          "Criminal record checks - assessing trustworthiness and legal history.",
          "Credit checks - assessing prospective candidates’ creditworthiness where relevant.",
        ],
      },
      {
        heading: "Reference Checks",
        body: [
          "NCBA and/or its appointed agents may perform reference checks to verify employment, education, professional qualification and background.",
        ],
        bullets: [
          "Employment reference checks - contacting former employers or supervisors to verify employment history, job responsibilities, work performance, and reasons for leaving.",
          "Academic reference checks - contacting educational institutions to verify academic degrees, achievements, and performance.",
        ],
      },
      {
        heading: "Consent",
        body: [
          "I authorize and consent to NCBA and/or its appointed agents using my personal data to conduct the background and/or reference checks described above.",
          "I understand that this consent is voluntary and may be withdrawn at any time by contacting NCBA’s Talent Acquisition team/Careers at Careers@ncbagroup.com.",
          "By providing this authorization, I release NCBA and/or its appointed agents from claims arising from the release or use of this information in connection with employment decisions made about me.",
        ],
      },
    ],
    completionNote:
      "Complete the declarations below to provide consent for screening and reference verification.",
  },
  "EMPLOYEE CONDUCT PLEDGE": {
    eyebrow: "Code of conduct attestation",
    title: "EMPLOYEE CONDUCT PLEDGE",
    summary:
      "Employees attest that they have read the NCBA Rwanda Code of Conduct and Ethics and agree to comply with it as part of their ongoing employment relationship.",
    accent: "from-amber-500 to-orange-500",
    sections: [
      {
        heading: "Policy Overview",
        body: [
          "The NCBA Rwanda Code of Conduct and Ethics outlines the principles and policies that govern NCBA Rwanda’s activities and applies to all internal and external stakeholders to the extent applicable.",
          "The Code is reviewed periodically by Human Resources and Legal and Company Secretary departments to ensure it stays aligned with the operating environment and governance expectations.",
        ],
      },
      {
        heading: "Expected Conduct",
        body: [
          "All stakeholders are expected to act with the highest standards of personal and professional integrity and comply with applicable local and international laws, regulations, best practices, and company policies.",
          "Employees should read this Code together with NCBA Rwanda policies, procedures, and applicable laws and regulations governing all activities across NCBA Rwanda’s operations.",
        ],
      },
      {
        heading: "Attestation",
        body: [
          "All staff must attest their commitment to abide by the Code and submit the attestation form to Human Resources by the communicated deadline.",
          "Failure to observe these policies may result in corrective action, up to and including immediate termination of employment or other relationships with NCBA Rwanda.",
        ],
      },
    ],
    completionNote:
      "The signature block below confirms your commitment to comply with the Code and Ethics.",
  },
  "STATEMENT OF INFORMATION PROCESSING RESPONSIBILITIES FOR ALL BANK STAFF": {
    eyebrow: "Information security acknowledgement",
    title: "STATEMENT OF INFORMATION PROCESSING RESPONSIBILITIES FOR ALL BANK STAFF",
    summary:
      "Bank staff acknowledge the information security policy, accept monitoring of bank resources, and commit to protecting data, systems, and copyrighted content.",
    accent: "from-emerald-500 to-teal-500",
    sections: [
      {
        heading: "Policy Statement",
        body: [
          "The NCBA Group Information Security Policy sets out business rules to protect information and the systems that store and process it.",
          "All NCBA employees, seconded agents, and outsourced staff are required to read, understand, and adhere to all provisions of the policy.",
        ],
      },
      {
        heading: "Responsibilities",
        body: [
          "Users should not expect personal privacy when using the Bank’s information processing resources.",
        ],
        bullets: [
          "Company information resources should not be used for personal use unless explicitly authorized.",
          "E-mail, network, and machine activity may be monitored by authorized NCBA personnel.",
          "Data created in the Bank’s systems remains the property of NCBA.",
          "All bank content, including text, graphics, photographs, audio, video, data compilations, and software, is protected by applicable laws.",
        ],
      },
      {
        heading: "Acknowledgement",
        body: ["I acknowledge that I have read, understood, and agree to comply with the NCBA Group Information Security Policy."],
      },
    ],
    completionNote:
      "Provide your acknowledgement and signature to confirm you understand your information processing responsibilities.",
  },
};

function isTargetForm(formName: string): formName is (typeof TARGET_FORM_NAMES)[number] {
  return (TARGET_FORM_NAMES as readonly string[]).includes(formName);
}

function getFieldValue(values: Record<string, string>, field: FormField): string {
  return values[field.id] ?? (field.field_type === "checkbox" ? "false" : "");
}

function getFieldLabel(field: FormField): string {
  if (field.field_name === "consent") {
    return "I consent to the background and reference checks described in this form";
  }

  if (field.field_name === "pledge") {
    return "I agree to read, understand, and comply with the NCBA Rwanda Code of Conduct and Ethics";
  }

  if (field.field_name === "acknowledgement") {
    return "I acknowledge that I have read and understood this policy";
  }

  return field.field_label;
}

/** Returns true for any field that should be rendered as a signature pad */
function isSignatureField(field: FormField): boolean {
  const name  = field.field_name.toLowerCase();
  const label = field.field_label.toLowerCase();
  return (
    name.includes("signature") ||
    name.includes("sign") ||
    label.includes("signature") ||
    label.includes("sign here")
  );
}

export default function RequiredFormsHub() {
  const { user, isLoading: authLoading } = useAuth();
  const [forms, setForms] = useState<FormStatus[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [submittingFormId, setSubmittingFormId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedForm = useMemo(
    () => forms.find((item) => item.form.id === selectedFormId) ?? forms[0] ?? null,
    [forms, selectedFormId]
  );

  useEffect(() => {
    if (!authLoading && user) {
      setIsLoading(true);
      apiClient.form
        .getMyRequiredForms()
        .then((payload) => {
          const filtered = payload.filter((item) => isTargetForm(item.form.name));
          setForms(filtered);
          setSelectedFormId((current) => current || filtered[0]?.form.id || "");

          const initialValues: Record<string, Record<string, string>> = {};
          filtered.forEach((item) => {
            initialValues[item.form.id] = {};
            item.form.fields?.forEach((field) => {
              initialValues[item.form.id][field.id] = field.field_type === "checkbox" ? "false" : "";
            });
          });
          setValues(initialValues);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load forms");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (selectedForm?.form.fields) {
      setValues((current) => {
        const next = { ...current };
        const formValues = { ...(next[selectedForm.form.id] || {}) };

        selectedForm.form.fields!.forEach((field) => {
          if (formValues[field.id] === undefined) {
            formValues[field.id] = field.field_type === "checkbox" ? "false" : "";
          }
        });

        next[selectedForm.form.id] = formValues;
        return next;
      });
    }
  }, [selectedForm]);

  const completedCount = forms.filter((item) => item.is_completed).length;
  const incompleteCount = forms.length - completedCount;

  const handleSubmit = async (event: React.FormEvent, formStatus: FormStatus) => {
    event.preventDefault();

    // Validate required signature fields
    const formValues = values[formStatus.form.id] || {};
    const missingSignature = (formStatus.form.fields || []).some(
      (field) => field.is_required && isSignatureField(field) && !formValues[field.id]
    );
    if (missingSignature) {
      setError("Please provide your signature before submitting.");
      return;
    }

    // Validate required checkboxes
    const missingCheckbox = (formStatus.form.fields || []).some(
      (field) => field.is_required && field.field_type === "checkbox" && formValues[field.id] !== "true"
    );
    if (missingCheckbox) {
      setError("Please check all required boxes before submitting.");
      return;
    }

    setSubmittingFormId(formStatus.form.id);
    setError("");
    setSuccess("");

    try {
      const formValues = values[formStatus.form.id] || {};
      const answers: FormAnswerInput[] = (formStatus.form.fields || []).map((field) => ({
        field_id: field.id,
        value:
          field.field_type === "checkbox"
            ? formValues[field.id] === "true"
              ? "true"
              : "false"
            : formValues[field.id] || "",
      }));

      await apiClient.form.submitMyForm(formStatus.form.id, answers);
      setSuccess(`${formStatus.form.name} submitted successfully.`);

      const refreshed = await apiClient.form.getMyRequiredForms();
      const filtered = refreshed.filter((item) => isTargetForm(item.form.name));
      setForms(filtered);
      setSelectedFormId(formStatus.form.id);
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

  return (
    <ProtectedRoute>
      <section className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative p-6 sm:p-8">
                <div className={`absolute inset-0 bg-gradient-to-br ${selectedForm ? FORM_COPY[selectedForm.form.name as keyof typeof FORM_COPY].accent : "from-cyan-500 to-sky-500"} opacity-[0.08]`} />
                <div className="relative space-y-4">
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-400">
                    NCBA Staff Forms
                  </p>
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    Required declarations and acknowledgements for onboarding and compliance
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {user?.full_name || user?.email || "You"} can complete the three mandatory forms below: background/reference consent, employee conduct pledge, and information processing responsibilities.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Forms</div>
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
              </div>

              <div className="border-t border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <FileSignature className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    Working set
                  </div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Select a form on the left to review the policy text, complete the required declarations, and submit your acknowledgement.
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Each form includes the exact NCBA wording, plus only the fields needed for signature, identity, and acknowledgement.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" /> Loading required forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              No targeted NCBA forms are assigned to your account yet.
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                {forms.map((item) => {
                  const copy = FORM_COPY[item.form.name as keyof typeof FORM_COPY];
                  return (
                    <button
                      key={item.form.id}
                      type="button"
                      onClick={() => setSelectedFormId(item.form.id)}
                      className={`w-full rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${markCard(item)} ${
                        selectedForm?.form.id === item.form.id ? "ring-2 ring-cyan-400/60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h2>
                          </div>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.summary}</p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_completed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {item.is_completed ? "Completed" : "Pending"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {item.is_completed ? <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                        {item.is_completed ? "Submitted and recorded" : "Awaiting your acknowledgement"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {selectedForm ? (
                  <form onSubmit={(event) => void handleSubmit(event, selectedForm)} className="space-y-8">
                    {(() => {
                      const copy = FORM_COPY[selectedForm.form.name as keyof typeof FORM_COPY];

                      return (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{copy.eyebrow}</p>
                              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{copy.title}</h2>
                              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.completionNote}</p>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                                selectedForm.is_completed
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              }`}
                            >
                              {selectedForm.is_completed ? "Completed" : "Pending"}
                            </span>
                          </div>

                          <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                            {copy.sections.map((section) => (
                              <div key={section.heading} className="space-y-3">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{section.heading}</h3>
                                {section.body.map((paragraph) => (
                                  <p key={paragraph} className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {paragraph}
                                  </p>
                                ))}
                                {section.bullets ? (
                                  <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {section.bullets.map((bullet) => (
                                      <li key={bullet} className="list-disc">
                                        {bullet}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            ))}
                          </div>

                          {selectedForm.form.fields?.length ? (
                            <div className="space-y-4">
                              {selectedForm.form.fields.map((field) => {
                                const fieldValue = getFieldValue(values[selectedForm.form.id] || {}, field);
                                const label = getFieldLabel(field);

                                return (
                                  <div key={field.id} className="space-y-1.5">
                                    {field.field_type === "checkbox" ? (
                                      <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                                        <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                                          <input
                                            type="checkbox"
                                            checked={fieldValue === "true"}
                                            disabled={selectedForm.is_completed}
                                            onChange={(event) =>
                                              setValues((current) => ({
                                                ...current,
                                                [selectedForm.form.id]: {
                                                  ...(current[selectedForm.form.id] || {}),
                                                  [field.id]: event.target.checked ? "true" : "false",
                                                },
                                              }))
                                            }
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                          />
                                          <span>{label}</span>
                                        </label>
                                      </div>
                                    ) : isSignatureField(field) ? (
                                      <SignaturePad
                                        label={label}
                                        required={field.is_required}
                                        disabled={selectedForm.is_completed}
                                        value={fieldValue}
                                        onChange={(dataURL) =>
                                          setValues((current) => ({
                                            ...current,
                                            [selectedForm.form.id]: {
                                              ...(current[selectedForm.form.id] || {}),
                                              [field.id]: dataURL,
                                            },
                                          }))
                                        }
                                      />
                                    ) : (
                                      <>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                          {label}
                                          {field.is_required ? <span className="ml-1 text-red-500">*</span> : null}
                                        </label>
                                        {field.field_type === "textarea" ? (
                                          <textarea
                                            value={fieldValue}
                                            disabled={selectedForm.is_completed}
                                            onChange={(event) =>
                                              setValues((current) => ({
                                                ...current,
                                                [selectedForm.form.id]: {
                                                  ...(current[selectedForm.form.id] || {}),
                                                  [field.id]: event.target.value,
                                                },
                                              }))
                                            }
                                            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-700"
                                          />
                                        ) : (
                                          <input
                                            type={
                                              field.field_type === "number"
                                                ? "number"
                                                : field.field_type === "date"
                                                  ? "date"
                                                  : field.field_type === "email"
                                                    ? "email"
                                                    : field.field_type === "phone"
                                                      ? "tel"
                                                      : "text"
                                            }
                                            value={fieldValue}
                                            disabled={selectedForm.is_completed}
                                            onChange={(event) =>
                                              setValues((current) => ({
                                                ...current,
                                                [selectedForm.form.id]: {
                                                  ...(current[selectedForm.form.id] || {}),
                                                  [field.id]: event.target.value,
                                                },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-cyan-400 dark:border-slate-700"
                                          />
                                        )}
                                      </>
                                    )}

                                    {field.help_text ? (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{field.help_text}</p>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                              This form is configured for acknowledgement only.
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            <Button type="submit" disabled={submittingFormId === selectedForm.form.id || selectedForm.is_completed}>
                              {submittingFormId === selectedForm.form.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                                </>
                              ) : selectedForm.is_completed ? (
                                "Already completed"
                              ) : (
                                <>
                                  Submit acknowledgement <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                            {selectedForm.submitted_at ? (
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                Submitted on {new Date(selectedForm.submitted_at).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </>
                      );
                    })()}
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