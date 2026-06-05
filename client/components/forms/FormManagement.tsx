'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import FormBuilder from './FormBuilder';
import {
  Edit2, Trash2, Plus, UserPlus, Users, UserMinus,
  BarChart2, X, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Eye, Pen, Printer,
} from 'lucide-react';
import type { Employee, Form, FormField } from '@/lib/types';

interface AssignedStaff {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  assigned_at: string;
}

interface FormResponseSummary {
  id: string;
  employee_id: string;
  form_id: string;
  is_completed: boolean;
  submitted_at: string | null;
  created_at: string;
}

interface FormAnswer {
  field_id: string;
  value: string | null;
}

interface DetailedResponse {
  answers: FormAnswer[];
  submitted_at: string | null;
  is_completed: boolean;
}

// ─── Inline Delete Confirm ───────────────────────────────────────────────────
const DeleteConfirm: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({
  onConfirm,
  onCancel,
}) => (
  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-3 py-2">
    <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
    <span className="text-sm text-red-700 dark:text-red-300">Delete this form?</span>
    <button onClick={onConfirm} className="ml-1 rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700">
      Yes, delete
    </button>
    <button onClick={onCancel} className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">
      Cancel
    </button>
  </div>
);

// ─── Answer value renderer ────────────────────────────────────────────────────
function AnswerValue({ field, value }: { field: FormField; value: string | null }) {
  if (!value || value.trim() === '') {
    return <span className="text-xs italic text-slate-400 dark:text-slate-500">—</span>;
  }

  // Signature field — render as image
  if (
    field.field_type === 'signature' ||
    field.field_name.toLowerCase().includes('sign') ||
    field.field_label.toLowerCase().includes('sign')
  ) {
    if (value.startsWith('data:image')) {
      return (
        <div className="mt-1">
          <img
            src={value}
            alt="Signature"
            className="max-h-20 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      );
    }
    return <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>;
  }

  // Checkbox
  if (field.field_type === 'checkbox') {
    return value === 'true' ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={13} /> Confirmed
      </span>
    ) : (
      <span className="text-xs text-slate-400 dark:text-slate-500">Not confirmed</span>
    );
  }

  return <span className="text-sm text-slate-800 dark:text-slate-200 break-words">{value}</span>;
}

// ─── Staff row with expandable answers ───────────────────────────────────────
function StaffResponseRow({
  staff,
  status,
  submittedAt,
  form,
}: {
  staff: AssignedStaff;
  status: 'completed' | 'in_progress' | 'not_started';
  submittedAt: string | null;
  form: Form;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [detail, setDetail]     = useState<DetailedResponse | null>(null);
  const [error, setError]       = useState('');

  const loadAnswers = async () => {
    if (detail) { setExpanded((e) => !e); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient.form.getEmployeeFormResponse(form.id, staff.employee_id);
      setDetail(res);
      setExpanded(true);
    } catch {
      setError('Could not load answers');
    } finally {
      setLoading(false);
    }
  };

  const printWithAnswers = async () => {
    // Ensure answers are loaded first
    let answers = detail?.answers;
    if (!answers) {
      try {
        const res = await apiClient.form.getEmployeeFormResponse(form.id, staff.employee_id);
        setDetail(res);
        answers = res.answers;
      } catch {
        alert('Could not load answers for printing.');
        return;
      }
    }

    const fields = form.fields ?? [];
    const answerMap: Record<string, string> = {};
    answers?.forEach((a) => { if (a.value) answerMap[a.field_id] = a.value; });

    const fieldRows = fields.map((f) => {
      const value = answerMap[f.id] ?? '';
      const isSignature = f.field_type === 'signature' || f.field_name.toLowerCase().includes('sign');
      const isCheckbox  = f.field_type === 'checkbox';
      const isTextarea  = f.field_type === 'textarea';

      if (isSignature) {
        return `
          <div class="field-block">
            <label>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</label>
            ${
              value && value.startsWith('data:image')
                ? `<img src="${value}" class="signature-img" alt="Signature" />`
                : `<div class="signature-box empty">No signature provided</div>`
            }
          </div>`;
      }

      if (isCheckbox) {
        const checked = value === 'true';
        return `
          <div class="field-block checkbox-block">
            <span class="checkbox-square${checked ? ' checked' : ''}">${checked ? '&#10003;' : ''}</span>
            <span>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</span>
          </div>`;
      }

      if (isTextarea) {
        return `
          <div class="field-block">
            <label>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</label>
            <div class="textarea-filled">${value || '<span class="empty-val">—</span>'}</div>
          </div>`;
      }

      return `
        <div class="field-block">
          <label>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</label>
          <div class="input-filled">${value || '<span class="empty-val">—</span>'}</div>
        </div>`;
    }).join('');

    const description = form.description ?? '';
    const submittedDate = submittedAt ? new Date(submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${form.name} — ${staff.employee_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', serif;
      font-size: 12pt;
      color: #111;
      background: #fff;
      padding: 40px 60px;
      max-width: 820px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .org-name {
      font-size: 9.5pt;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 5px;
    }
    .form-title {
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .form-meta {
      margin-top: 5px;
      font-size: 9pt;
      color: #666;
    }
    /* Staff info box */
    .staff-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 20px;
      background: #f9f9f9;
    }
    .staff-info-item { font-size: 10pt; }
    .staff-info-item .si-label {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #777;
      margin-bottom: 2px;
    }
    .staff-info-item .si-value { font-weight: bold; color: #111; }
    /* Description */
    .description {
      margin-bottom: 20px;
      font-size: 10.5pt;
      line-height: 1.7;
      color: #333;
      border-left: 3px solid #bbb;
      padding-left: 14px;
    }
    /* Fields */
    .fields-section h3 {
      font-size: 10.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid #999;
      padding-bottom: 4px;
      margin-bottom: 16px;
      color: #333;
    }
    .field-block { margin-bottom: 18px; }
    label {
      display: block;
      font-size: 9.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      margin-bottom: 5px;
    }
    .req { color: #c00; }
    .input-filled {
      border-bottom: 1px solid #999;
      padding: 4px 0;
      min-height: 26px;
      font-size: 11pt;
      color: #111;
    }
    .textarea-filled {
      border: 1px solid #999;
      border-radius: 2px;
      padding: 8px;
      min-height: 70px;
      font-size: 11pt;
      color: #111;
      white-space: pre-wrap;
    }
    .empty-val { color: #bbb; font-style: italic; }
    .signature-img {
      max-height: 80px;
      border: 1px solid #ccc;
      border-radius: 3px;
      background: #fff;
      padding: 4px;
    }
    .signature-box {
      border: 1px dashed #bbb;
      border-radius: 2px;
      height: 64px;
      width: 55%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #bbb;
      font-size: 9.5pt;
      font-style: italic;
    }
    .checkbox-block {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .checkbox-square {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border: 1.5px solid #555;
      margin-top: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12pt;
      line-height: 1;
    }
    .checkbox-square.checked { border-color: #111; color: #111; }
    /* Footer */
    .footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      font-size: 8.5pt;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
    .submitted-stamp {
      margin-top: 32px;
      border: 1.5px solid #555;
      border-radius: 4px;
      display: inline-block;
      padding: 8px 16px;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #333;
    }
    @media print {
      body { padding: 20px 36px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">NCBA Rwanda — Human Resources</div>
    <div class="form-title">${form.name}</div>
    <div class="form-meta">Ref: HR / ${new Date().getFullYear()}</div>
  </div>

  <div class="staff-info">
    <div class="staff-info-item">
      <div class="si-label">Staff Member</div>
      <div class="si-value">${staff.employee_name}</div>
    </div>
    <div class="staff-info-item">
      <div class="si-label">Email</div>
      <div class="si-value">${staff.employee_email}</div>
    </div>
    <div class="staff-info-item">
      <div class="si-label">Date Submitted</div>
      <div class="si-value">${submittedDate}</div>
    </div>
    <div class="staff-info-item">
      <div class="si-label">Status</div>
      <div class="si-value">Completed</div>
    </div>
  </div>

  ${description ? `<div class="description">${description.replace(/<script[^>]*>.*?<\/script>/gi, '')}</div>` : ''}

  ${fields.length > 0 ? `
  <div class="fields-section">
    <h3>Submitted Answers</h3>
    ${fieldRows}
  </div>` : '<p style="color:#999;font-style:italic;font-size:10pt">This form had no fields.</p>'}

  <div class="submitted-stamp">&#10003; Submitted — ${submittedDate}</div>

  <div class="footer">
    <span>NCBA Rwanda — Confidential HR Document</span>
    <span>Printed: ${new Date().toLocaleString()}</span>
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=920,height=720');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const statusCls =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : status === 'in_progress'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';

  const fields = form.fields ?? [];

  return (
    <li className="rounded-xl border border-violet-100 dark:border-violet-800/50 bg-white dark:bg-slate-800/50 overflow-hidden">
      {/* Row header */}
      <div className="flex items-center justify-between px-3 py-2.5 gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{staff.employee_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{staff.employee_email}</p>
          {submittedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Submitted {new Date(submittedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
            {status === 'completed' && <CheckCircle2 size={11} />}
            {status === 'in_progress' && <Clock size={11} />}
            {status === 'not_started' && <AlertCircle size={11} />}
            {status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In progress' : 'Not started'}
          </span>

          {status === 'completed' && (
            <>
              {/* View answers */}
              <button
                onClick={loadAnswers}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              >
                {loading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                ) : expanded ? (
                  <ChevronUp size={12} />
                ) : (
                  <Eye size={12} />
                )}
                {expanded ? 'Hide' : 'View'}
              </button>

              {/* Print with answers */}
              <button
                onClick={printWithAnswers}
                title="Print completed form"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Printer size={12} />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded answers */}
      {expanded && detail && (
        <div className="border-t border-violet-100 dark:border-violet-800/40 bg-slate-50 dark:bg-slate-900/60 px-4 py-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Submitted answers
          </p>
          {fields.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No fields defined for this form.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => {
                const answer = detail.answers.find((a) => a.field_id === field.id);
                return (
                  <div key={field.id} className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {field.field_type === 'signature' || field.field_name.toLowerCase().includes('sign') ? (
                        <Pen size={10} className="shrink-0" />
                      ) : null}
                      {field.field_label}
                      {field.is_required && <span className="text-red-400">*</span>}
                    </p>
                    <AnswerValue field={field} value={answer?.value ?? null} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="px-3 pb-2 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </li>
  );
}

// ─── Progress Tracker Panel ───────────────────────────────────────────────────
const ProgressPanel: React.FC<{
  form: Form;
  assignedStaff: AssignedStaff[];
  responses: FormResponseSummary[];
  isLoading: boolean;
}> = ({ form, assignedStaff, responses, isLoading }) => {
  const totalAssigned = assignedStaff.length;
  const completed     = responses.filter((r) => r.is_completed).length;
  const inProgress    = responses.filter((r) => !r.is_completed).length;
  const notStarted    = Math.max(0, totalAssigned - responses.length);
  const pct           = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  const getStatus = (employeeId: string): 'completed' | 'in_progress' | 'not_started' => {
    const r = responses.find((res) => res.employee_id === employeeId);
    if (!r) return 'not_started';
    return r.is_completed ? 'completed' : 'in_progress';
  };

  const getSubmittedAt = (employeeId: string) =>
    responses.find((r) => r.employee_id === employeeId)?.submitted_at ?? null;

  return (
    <div className="mt-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-4">
      <div className="flex items-center gap-2 font-semibold text-violet-900 dark:text-violet-200">
        <BarChart2 size={16} /> Completion Progress
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading progress data…</p>
      ) : (
        <>
          {/* Summary bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{completed} of {totalAssigned} completed</span>
              <span className="font-semibold text-violet-700 dark:text-violet-300">{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-4 text-xs pt-1">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> {completed} completed
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock size={12} /> {inProgress} in progress
              </span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <AlertCircle size={12} /> {notStarted} not started
              </span>
            </div>
          </div>

          {/* Per-staff rows */}
          {assignedStaff.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No staff assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {assignedStaff.map((s) => (
                <StaffResponseRow
                  key={s.employee_id}
                  staff={s}
                  status={getStatus(s.employee_id)}
                  submittedAt={getSubmittedAt(s.employee_id)}
                  form={form}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FormManagement: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [assignmentFormId, setAssignmentFormId] = useState<string | null>(null);
  const [progressFormId, setProgressFormId] = useState<string | null>(null);
  const [selectedEmployeeByForm, setSelectedEmployeeByForm] = useState<Record<string, string>>({});
  const [assignedStaffByForm, setAssignedStaffByForm] = useState<Record<string, AssignedStaff[]>>({});
  const [responsesByForm, setResponsesByForm] = useState<Record<string, FormResponseSummary[]>>({});
  const [fullFormById, setFullFormById] = useState<Record<string, Form>>({});
  const [isAssigningByForm, setIsAssigningByForm] = useState<Record<string, boolean>>({});
  const [isLoadingAssignedByForm, setIsLoadingAssignedByForm] = useState<Record<string, boolean>>({});
  const [isLoadingProgressByForm, setIsLoadingProgressByForm] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadStaff = async (): Promise<Employee[]> => {
    const pageSize = 100;
    let skip = 0;
    const collected: Employee[] = [];
    while (true) {
      const page = await apiClient.employee.getAll(skip, pageSize);
      if (!page || page.length === 0) break;
      collected.push(...page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }
    return collected;
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [formsResponse, employeesResponse] = await Promise.all([
        apiClient.form.getAllForms(),
        loadStaff(),
      ]);
      setForms(formsResponse || []);
      setStaff((employeesResponse || []).filter((e) => e.role !== 'admin'));
    } catch {
      showToast('error', 'Failed to load forms and staff');
    } finally {
      setIsLoading(false);
    }
  };

  const loadForms = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.form.getAllForms();
      setForms(response || []);
    } catch {
      showToast('error', 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedStaff = async (formId: string) => {
    setIsLoadingAssignedByForm((p) => ({ ...p, [formId]: true }));
    try {
      const assigned = await apiClient.form.getStaffAssignedToForm(formId);
      setAssignedStaffByForm((p) => ({ ...p, [formId]: (assigned || []) as AssignedStaff[] }));
    } catch {
      showToast('error', 'Failed to load assigned staff');
    } finally {
      setIsLoadingAssignedByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const loadProgressData = async (formId: string) => {
    setIsLoadingProgressByForm((p) => ({ ...p, [formId]: true }));
    try {
      // Fetch assigned staff, full form detail (with fields), and responses in parallel
      const [, fullForm, responses] = await Promise.all([
        assignedStaffByForm[formId] ? Promise.resolve() : loadAssignedStaff(formId),
        apiClient.form.getById(formId),
        apiClient.form.getFormResponses(formId),
      ]);
      setFullFormById((p) => ({ ...p, [formId]: fullForm }));
      setResponsesByForm((p) => ({ ...p, [formId]: (responses || []) as FormResponseSummary[] }));
    } catch {
      showToast('error', 'Failed to load progress data');
    } finally {
      setIsLoadingProgressByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const toggleAssignmentPanel = async (formId: string) => {
    if (assignmentFormId === formId) {
      setAssignmentFormId(null);
      return;
    }
    // Close progress if open
    if (progressFormId === formId) setProgressFormId(null);
    setAssignmentFormId(formId);
    await loadAssignedStaff(formId);
  };

  const toggleProgressPanel = async (formId: string) => {
    if (progressFormId === formId) {
      setProgressFormId(null);
      return;
    }
    // Close assignment if open
    if (assignmentFormId === formId) setAssignmentFormId(null);
    setProgressFormId(formId);
    await loadProgressData(formId);
  };

  const handleAssignForm = async (formId: string) => {
    const employeeId = selectedEmployeeByForm[formId];
    if (!employeeId) {
      showToast('error', 'Please select a staff member');
      return;
    }
    setIsAssigningByForm((p) => ({ ...p, [formId]: true }));
    try {
      await apiClient.form.assignFormToEmployee(formId, employeeId);
      showToast('success', 'Form assigned successfully');
      setSelectedEmployeeByForm((p) => ({ ...p, [formId]: '' }));
      await loadAssignedStaff(formId);
    } catch {
      showToast('error', 'Failed to assign form');
    } finally {
      setIsAssigningByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const handleUnassignForm = async (formId: string, employeeId: string) => {
    setIsAssigningByForm((p) => ({ ...p, [formId]: true }));
    try {
      await apiClient.form.unassignFormFromEmployee(formId, employeeId);
      showToast('success', 'Form unassigned successfully');
      await loadAssignedStaff(formId);
    } catch {
      showToast('error', 'Failed to unassign form');
    } finally {
      setIsAssigningByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      await apiClient.form.deleteForm(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
      if (selectedFormId === formId) { setSelectedFormId(null); setIsCreating(false); }
      showToast('success', 'Form deleted');
    } catch {
      showToast('error', 'Failed to delete form');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleFormSaved = () => {
    loadForms();
    setSelectedFormId(null);
    setIsCreating(false);
  };

  const printFormPage = async (form: Form) => {
    // Fetch full form if fields not loaded yet
    let fullForm = form;
    if (!form.fields || form.fields.length === 0) {
      try { fullForm = await apiClient.form.getById(form.id); } catch {}
    }

    const fields = fullForm.fields ?? [];
    const description = fullForm.description ?? '';

    const fieldRows = fields.map((f) => {
      const isSignature = f.field_type === 'signature' || f.field_name.toLowerCase().includes('sign');
      const isCheckbox  = f.field_type === 'checkbox';
      const isTextarea  = f.field_type === 'textarea';

      if (isSignature) {
        return `
          <div class="field-block">
            <label>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</label>
            <div class="signature-box">Sign here</div>
          </div>`;
      }
      if (isCheckbox) {
        return `
          <div class="field-block checkbox-block">
            <span class="checkbox-square"></span>
            <span>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</span>
          </div>`;
      }
      if (isTextarea) {
        return `
          <div class="field-block">
            <label>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</label>
            <div class="text-area-box"></div>
          </div>`;
      }
      return `
        <div class="field-block">
          <label>${f.field_label}${f.is_required ? ' <span class="req">*</span>' : ''}</label>
          <div class="input-line"></div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${fullForm.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', serif;
      font-size: 12pt;
      color: #111;
      background: #fff;
      padding: 40px 60px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .org-name {
      font-size: 10pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 6px;
    }
    .form-title {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-meta {
      margin-top: 6px;
      font-size: 9pt;
      color: #777;
    }
    .description {
      margin-bottom: 24px;
      font-size: 10.5pt;
      line-height: 1.7;
      color: #222;
      border-left: 3px solid #ccc;
      padding-left: 14px;
    }
    .description p { margin-bottom: 8px; }
    .fields-section h3 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid #aaa;
      padding-bottom: 4px;
      margin-bottom: 16px;
      color: #333;
    }
    .field-block {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #444;
      margin-bottom: 6px;
    }
    .req { color: #c00; font-weight: bold; }
    .input-line {
      border-bottom: 1px solid #333;
      height: 28px;
      width: 100%;
    }
    .text-area-box {
      border: 1px solid #333;
      height: 80px;
      width: 100%;
      border-radius: 2px;
    }
    .signature-box {
      border: 1px solid #333;
      border-radius: 2px;
      height: 72px;
      width: 60%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #bbb;
      font-size: 10pt;
      font-style: italic;
      letter-spacing: 0.05em;
    }
    .checkbox-block {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .checkbox-square {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border: 1.5px solid #333;
      margin-top: 2px;
    }
    .footer {
      margin-top: 48px;
      border-top: 1px solid #ccc;
      padding-top: 12px;
      font-size: 9pt;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 20px 40px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">NCBA Rwanda — Human Resources</div>
    <div class="form-title">${fullForm.name}</div>
    <div class="form-meta">Ref: HR / ${new Date().getFullYear()} &nbsp;|&nbsp; Date: ___________________</div>
  </div>

  ${description ? `<div class="description">${description.replace(/<[^>]*>/g, (m) => m)}</div>` : ''}

  ${fields.length > 0 ? `
  <div class="fields-section">
    <h3>To be completed by staff member</h3>
    ${fieldRows}
  </div>` : ''}

  <div class="footer">
    <span>NCBA Rwanda — Confidential</span>
    <span>Page 1 of 1</span>
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // ── FormBuilder view ────────────────────────────────────────────────────────
  if (isCreating || selectedFormId) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setIsCreating(false); setSelectedFormId(null); }}
          className="rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Back to Forms
        </button>
        <FormBuilder formId={selectedFormId || undefined} onFormSaved={handleFormSaved} />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Form Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create New Form
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Loading forms…</div>
      ) : forms.length === 0 ? (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">No forms yet. Create your first form to get started.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Create Form
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Form header row */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{form.name}</h3>
                  {form.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {form.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{form.fields?.length || 0} fields</span>
                    <span>
                      Status:{' '}
                      <span className={form.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="ml-4 flex gap-2 flex-shrink-0">
                  {/* Print button */}
                  <button
                    onClick={() => printFormPage(fullFormById[form.id] ?? form)}
                    className="rounded-md bg-slate-100 dark:bg-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    title="Print blank form"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => toggleProgressPanel(form.id)}
                    className={`rounded-md p-2 ${
                      progressFormId === form.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60'
                    }`}
                    title="Track progress"
                  >
                    <BarChart2 size={18} />
                  </button>
                  {/* Assign button */}
                  <button
                    onClick={() => toggleAssignmentPanel(form.id)}
                    className={`rounded-md p-2 ${
                      assignmentFormId === form.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60'
                    }`}
                    title="Assign to staff"
                  >
                    <UserPlus size={18} />
                  </button>
                  {/* Edit button */}
                  <button
                    onClick={() => setSelectedFormId(form.id)}
                    className="rounded-md bg-blue-100 dark:bg-blue-900/40 p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    title="Edit form"
                  >
                    <Edit2 size={18} />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDeleteId(form.id)}
                    className="rounded-md bg-red-100 dark:bg-red-900/40 p-2 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                    title="Delete form"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Inline delete confirmation */}
              {confirmDeleteId === form.id && (
                <div className="mt-3">
                  <DeleteConfirm
                    onConfirm={() => handleDeleteForm(form.id)}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                </div>
              )}

              {/* Progress panel */}
              {progressFormId === form.id && (
                <ProgressPanel
                  form={fullFormById[form.id] ?? form}
                  assignedStaff={assignedStaffByForm[form.id] || []}
                  responses={responsesByForm[form.id] || []}
                  isLoading={isLoadingProgressByForm[form.id] || false}
                />
              )}

              {/* Assignment panel */}
              {assignmentFormId === form.id && (
                <div className="mt-4 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    <Users size={16} />
                    Assign this form to staff
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                      value={selectedEmployeeByForm[form.id] || ''}
                      onChange={(e) =>
                        setSelectedEmployeeByForm((p) => ({ ...p, [form.id]: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm md:max-w-sm"
                    >
                      <option value="">Select staff member</option>
                      {staff.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.full_name} ({employee.email})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleAssignForm(form.id)}
                      disabled={isAssigningByForm[form.id]}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      <UserPlus size={16} />
                      {isAssigningByForm[form.id] ? 'Assigning…' : 'Assign Form'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                      Assigned Staff
                    </p>

                    {isLoadingAssignedByForm[form.id] ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
                    ) : (assignedStaffByForm[form.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">No staff assigned yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(assignedStaffByForm[form.id] || []).map((entry) => (
                          <li
                            key={`${form.id}-${entry.employee_id}`}
                            className="flex items-center justify-between rounded-md border border-indigo-100 dark:border-indigo-800/50 bg-white dark:bg-gray-800/50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {entry.employee_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{entry.employee_email}</p>
                            </div>
                            <button
                              onClick={() => handleUnassignForm(form.id, entry.employee_id)}
                              disabled={isAssigningByForm[form.id]}
                              className="inline-flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/40 px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 disabled:opacity-60"
                            >
                              <UserMinus size={14} /> Unassign
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormManagement;
