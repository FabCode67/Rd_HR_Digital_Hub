"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
import Link from "next/link";
import { API_CONFIG } from "@/lib/config";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
}

export default function StaffManagementPage() {
  const { user, token } = useAuth();
  const apiBaseUrl = `${API_CONFIG.baseURL}${API_CONFIG.apiPrefix}`;
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    initial_password: "",
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    fetchStaff();
  }, [user, token]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBaseUrl}/employees?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setError("Failed to load staff members");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
    setFormData({ ...formData, initial_password: password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.full_name || !formData.email) {
      setError("Full name and email are required");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/create-staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          initial_password: formData.initial_password || undefined,
          role: "staff",
          status: "ACTIVE",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create staff member");
      }

      const newStaff = await response.json();
      setStaff([...staff, newStaff]);
      setSuccess(
        `Staff member "${formData.full_name}" created successfully!${
          formData.initial_password ? ` Password: ${formData.initial_password}` : ""
        }`
      );
      setFormData({ full_name: "", email: "", phone: "", initial_password: "" });
      setGeneratedPassword("");
      setShowForm(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to create staff member");
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/employees/${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete staff member");
      }

      setStaff(staff.filter((s) => s.id !== staffId));
      setSuccess("Staff member deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete staff member");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(id);
    setTimeout(() => setCopiedPassword(null), 2000);
  };

  if (user?.role !== "admin") {
    return (
      <ProtectedRoute requiredRole="admin">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-slate-600 dark:text-slate-300">Access denied</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Staff Management
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Create and manage employee accounts
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Add New Staff
          </Button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-300">
            {success}
          </div>
        )}

        {/* Create Staff Form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
              Create New Staff Member
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250788123456"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.initial_password}
                  onChange={(e) => setFormData({ ...formData, initial_password: e.target.value })}
                  placeholder="Will be auto-generated if left empty"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 font-mono text-sm"
                />
                {generatedPassword && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Generated: {generatedPassword}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Create Staff Member
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ full_name: "", email: "", phone: "", initial_password: "" });
                    setGeneratedPassword("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Staff List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-500"></div>
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-600 dark:text-slate-400">
                      No staff members found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {member.full_name}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {member.phone || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                          {member.role === "admin" ? "Admin" : "Staff"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            member.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/employees/${member.id}`}>
                            <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
