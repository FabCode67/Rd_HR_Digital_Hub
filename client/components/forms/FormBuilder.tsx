'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import RichTextEditor from './RichTextEditor';
import SignaturePad from './SignaturePad';
import { Plus, Trash2, Save, Pen, GripVertical } from 'lucide-react';
import type { FormField as ApiFormField, FormFieldType } from '@/lib/types';

type FormFieldDraft = Pick<
  ApiFormField,
  'field_name' | 'field_label' | 'field_type' | 'is_required' | 'order'
> & {
  id?: string;
  help_text?: string;
  options?: string;
};

interface FormData {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
  fields?: FormFieldDraft[];
}

const FIELD_TYPES: { value: string; label: string; description: string }[] = [
  { value: 'text',      label: 'Text',        description: 'Short text input' },
  { value: 'textarea',  label: 'Text Area',   description: 'Multi-line text' },
  { value: 'signature', label: 'Signature',   description: 'Hand-drawn signature pad' },
  { value: 'email',     label: 'Email',       description: 'Email address' },
  { value: 'phone',     label: 'Phone',       description: 'Phone number' },
  { value: 'number',    label: 'Number',      description: 'Numeric value' },
  { value: 'date',      label: 'Date',        description: 'Date picker' },
  { value: 'datetime',  label: 'Date & Time', description: 'Date and time' },
  { value: 'checkbox',  label: 'Checkbox',    description: 'Yes / No checkbox' },
  { value: 'select',    label: 'Dropdown',    description: 'Select from options' },
  { value: 'radio',     label: 'Radio',       description: 'Choose one option' },
];

const FormBuilder: React.FC<{ formId?: string; onFormSaved?: () => void }> = ({
  formId,
  onFormSaved,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    is_active: true,
    fields: [],
  });

  const [fields, setFields] = useState<FormFieldDraft[]>([]);
  const [newField, setNewField] = useState<FormFieldDraft>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    is_required: true,
    help_text: '',
    options: '',
    order: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (formId) loadForm();
  }, [formId]);

  const loadForm = async () => {
    if (!formId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.form.getById(formId);
      if (response) {
        setFormData({
          id: response.id,
          name: response.name,
          description: response.description || '',
          is_active: response.is_active,
        });
        setFields(response.fields || []);
      }
    } catch {
      setError('Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddField = () => {
    if (!newField.field_name.trim() || !newField.field_label.trim()) {
      setError('Field name and label are required');
      return;
    }
    setFields(prev => [...prev, { ...newField, order: prev.length }]);
    setNewField({ field_name: '', field_label: '', field_type: 'text', is_required: true, help_text: '', options: '', order: 0 });
    setError(null);
  };

  const handleSaveForm = async () => {
    if (!formData.name.trim()) { setError('Form name is required'); return; }
    if (fields.length === 0)   { setError('Add at least one field'); return; }

    setIsLoading(true); setError(null);
    try {
      if (formData.id) {
        await apiClient.form.updateForm(formData.id, {
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
        });
        const original = new Set((await apiClient.form.getById(formData.id)).fields?.map(f => f.id) ?? []);
        const current  = new Set(fields.filter(f => f.id).map(f => f.id as string));
        await Promise.all([...original].filter(id => !current.has(id)).map(id => apiClient.form.deleteFormField(id)));
        await Promise.all(
          fields.filter(f => !f.id).map(f =>
            apiClient.form.addFormField(formData.id!, {
              field_name: f.field_name, field_label: f.field_label,
              field_type: f.field_type as any, is_required: f.is_required,
              help_text: f.help_text, options: f.options, order: fields.indexOf(f),
            })
          )
        );
        setSuccess('Form updated!');
      } else {
        const result = await apiClient.form.createForm({
          name: formData.name, description: formData.description, is_active: formData.is_active,
          fields: fields.map((f, i) => ({
            field_name: f.field_name, field_label: f.field_label,
            field_type: f.field_type as any, is_required: f.is_required,
            help_text: f.help_text, options: f.options, order: i,
          })),
        });
        setFormData(prev => ({ ...prev, id: result.id }));
        setSuccess('Form created!');
      }
      setTimeout(() => { setSuccess(null); onFormSaved?.(); }, 2000);
    } catch {
      setError('Failed to save form');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldTypeInfo = FIELD_TYPES.find(t => t.value === newField.field_type);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {formData.id ? 'Edit Form' : 'Create New Form'}
      </h2>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </div>
      )}

      {/* ── Form metadata ── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Form Name</label>
          <input
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Background Check Consent"
            className="field mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description / Terms</label>
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
            Use rich text to add policy text, terms, and instructions
          </p>
          <RichTextEditor
            value={formData.description}
            onChange={v => setFormData(prev => ({ ...prev, description: v }))}
            placeholder="Add form description, terms & conditions..."
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active (visible to staff)
        </label>
      </div>

      {/* ── Existing fields ── */}
      <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Form Fields ({fields.length})</h3>

        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No fields yet — add one below
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={index}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <GripVertical className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {field.field_type === 'signature' && (
                      <Pen className="h-3.5 w-3.5 text-cyan-500" />
                    )}
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {field.field_label}
                    </p>
                    {field.is_required && (
                      <span className="text-xs text-red-500">*</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {FIELD_TYPES.find(t => t.value === field.field_type)?.label ?? field.field_type}
                    {field.field_name ? ` · ${field.field_name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFields(prev => prev.filter((_, i) => i !== index))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add new field ── */}
      <div className="space-y-4 rounded-2xl border border-cyan-200 bg-cyan-50/50 p-5 dark:border-cyan-900/40 dark:bg-cyan-950/10">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100">Add New Field</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Field Name <span className="text-slate-400">(internal key)</span>
            </label>
            <input
              value={newField.field_name}
              onChange={e => setNewField(prev => ({ ...prev, field_name: e.target.value }))}
              placeholder="e.g., employee_signature"
              className="field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Field Label <span className="text-slate-400">(shown to staff)</span>
            </label>
            <input
              value={newField.field_label}
              onChange={e => setNewField(prev => ({ ...prev, field_label: e.target.value }))}
              placeholder="e.g., Employee Signature"
              className="field"
            />
          </div>

          {/* Field type selector — visual cards */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Field Type
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {FIELD_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setNewField(prev => ({ ...prev, field_type: type.value as FormFieldType }))}
                  className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-all ${
                    newField.field_type === type.value
                      ? 'border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  {type.value === 'signature' && <Pen className="mb-1 h-3.5 w-3.5" />}
                  {type.label}
                </button>
              ))}
            </div>
            {fieldTypeInfo && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {fieldTypeInfo.description}
              </p>
            )}
          </div>

          {/* Signature preview */}
          {newField.field_type === 'signature' && (
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Preview — this is what staff will see:
              </p>
              <SignaturePad
                label={newField.field_label || 'Signature'}
                required={newField.is_required}
              />
            </div>
          )}

          {/* Options for select/radio */}
          {(newField.field_type === 'select' || newField.field_type === 'radio') && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Options <span className="text-slate-400">(comma-separated)</span>
              </label>
              <input
                value={newField.options}
                onChange={e => setNewField(prev => ({ ...prev, options: e.target.value }))}
                placeholder="Option A, Option B, Option C"
                className="field"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Help Text <span className="text-slate-400">(optional hint shown below the field)</span>
            </label>
            <input
              value={newField.help_text}
              onChange={e => setNewField(prev => ({ ...prev, help_text: e.target.value }))}
              placeholder="e.g., Sign using your mouse or finger"
              className="field"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="field-required"
              checked={newField.is_required}
              onChange={e => setNewField(prev => ({ ...prev, is_required: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600"
            />
            <label htmlFor="field-required" className="text-sm text-slate-700 dark:text-slate-300">
              Required field
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddField}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Field
        </button>
      </div>

      {/* ── Save ── */}
      <div className="flex gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        <button
          type="button"
          onClick={handleSaveForm}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving…' : formData.id ? 'Update Form' : 'Create Form'}
        </button>
      </div>
    </div>
  );
};

export default FormBuilder;
