'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import RichTextEditor from './RichTextEditor';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import type { FormField as ApiFormField } from '@/lib/types';

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

const FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'number',
  'date',
  'datetime',
  'select',
  'checkbox',
  'radio',
  'textarea',
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

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load form if editing
  useEffect(() => {
    if (formId) {
      loadForm();
    }
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
    } catch (err) {
      setError('Failed to load form');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleDescriptionChange = (value: string) => {
    setFormData({
      ...formData,
      description: value,
    });
  };

  const handleAddField = () => {
    if (!newField.field_name || !newField.field_label) {
      setError('Field name and label are required');
      return;
    }

    const fieldWithOrder = {
      ...newField,
      order: fields.length,
    };

    setFields([...fields, fieldWithOrder]);
    setNewField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: true,
      help_text: '',
      options: '',
      order: 0,
    });
    setError(null);
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: string, value: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = {
      ...updatedFields[index],
      [key]: value,
    };
    setFields(updatedFields);
  };

  const handleNewFieldChange = (key: string, value: any) => {
    setNewField({
      ...newField,
      [key]: value,
    });
  };

  const handleSaveForm = async () => {
    if (!formData.name.trim()) {
      setError('Form name is required');
      return;
    }

    if (fields.length === 0) {
      setError('Form must have at least one field');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (formData.id) {
        // --- UPDATE PATH ---
        // 1. Save form metadata
        await apiClient.form.updateForm(formData.id, {
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
        });

        // 2. Sync fields: delete removed fields, add new ones
        //    Fields that already have an `id` existed on the server.
        //    Fields without an `id` are newly added in this session.
        const originalIds = new Set(
          (await apiClient.form.getById(formData.id)).fields?.map((f) => f.id) ?? []
        );
        const currentIds = new Set(fields.filter((f) => f.id).map((f) => f.id as string));

        // Delete fields that were removed
        const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
        await Promise.all(toDelete.map((id) => apiClient.form.deleteFormField(id)));

        // Add new fields (those without an id)
        const toAdd = fields.filter((f) => !f.id);
        await Promise.all(
          toAdd.map((field, i) =>
            apiClient.form.addFormField(formData.id!, {
              field_name: field.field_name,
              field_label: field.field_label,
              field_type: field.field_type as any,
              is_required: field.is_required,
              help_text: field.help_text,
              options: field.options,
              order: fields.indexOf(field),
            })
          )
        );

        setSuccess('Form updated successfully!');
      } else {
        // --- CREATE PATH ---
        const result = await apiClient.form.createForm({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          fields: fields.map((field, index) => ({
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type as any,
            is_required: field.is_required,
            help_text: field.help_text,
            options: field.options,
            order: index,
          })),
        });
        setFormData({ ...formData, id: result.id });
        setSuccess('Form created successfully!');
      }

      setTimeout(() => {
        setSuccess(null);
        if (onFormSaved) onFormSaved();
      }, 2000);
    } catch (err) {
      setError('Failed to save form');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-bold">{formData.id ? 'Edit Form' : 'Create New Form'}</h2>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Form Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Form Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="e.g., Background Check Form"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Form Description (with Terms & Conditions)
          </label>
          <p className="mb-2 text-sm text-gray-500">
            Use rich text to add terms, conditions, and instructions
          </p>
          <RichTextEditor
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Add form description, terms & conditions..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleFormChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label className="ml-2 text-sm text-gray-700">Active</label>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold">Form Fields</h3>

        {/* Existing Fields */}
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{field.field_label}</p>
                <p className="text-sm text-gray-500">
                  {field.field_type} {field.is_required ? '(required)' : '(optional)'}
                </p>
              </div>
              <button
                onClick={() => handleDeleteField(index)}
                className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Field */}
        <div className="space-y-4 rounded-md border border-gray-200 bg-blue-50 p-4">
          <h4 className="font-semibold text-gray-900">Add New Field</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Field Name</label>
              <input
                type="text"
                value={newField.field_name}
                onChange={(e) => handleNewFieldChange('field_name', e.target.value)}
                placeholder="e.g., first_name"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Field Label</label>
              <input
                type="text"
                value={newField.field_label}
                onChange={(e) => handleNewFieldChange('field_label', e.target.value)}
                placeholder="e.g., First Name"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Field Type</label>
              <select
                value={newField.field_type}
                onChange={(e) => handleNewFieldChange('field_type', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={newField.is_required}
                  onChange={(e) => handleNewFieldChange('is_required', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="ml-2">Required</span>
              </label>
            </div>

            {(newField.field_type === 'select' || newField.field_type === 'radio') && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Options (comma-separated)
                </label>
                <input
                  type="text"
                  value={newField.options}
                  onChange={(e) => handleNewFieldChange('options', e.target.value)}
                  placeholder="e.g., Option 1, Option 2, Option 3"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Help Text</label>
              <input
                type="text"
                value={newField.help_text}
                onChange={(e) => handleNewFieldChange('help_text', e.target.value)}
                placeholder="Optional help text for the field"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <button
            onClick={handleAddField}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Field
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4 border-t border-gray-200 pt-6">
        <button
          onClick={handleSaveForm}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
        >
          <Save size={18} />
          {isLoading ? 'Saving...' : 'Save Form'}
        </button>
      </div>
    </div>
  );
};

export default FormBuilder;
