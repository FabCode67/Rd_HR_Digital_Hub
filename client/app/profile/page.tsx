"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Briefcase, Calendar } from "lucide-react";
import Link from "next/link";
import { API_CONFIG } from "@/lib/config";

export default function ProfilePage() {
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
      return;
    }

    if (user) {
      setProfileData(user);
      setIsLoading(false);
    }
  }, [authLoading, token, user, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-500"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-600 dark:text-slate-300">No profile data available</p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Derive a safe display name and initials when `full_name` may be missing
  const displayName: string =
    (profileData && (profileData.full_name || (profileData.email && profileData.email.split("@")[0]))) || "";

  const initials: string = displayName
    ? displayName
        .split(" ")
        .slice(0, 2)
        .map((word: string) => word[0] || "")
        .join("")
        .toUpperCase()
    : profileData?.email
    ? profileData.email.charAt(0).toUpperCase()
    : "";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header with back button */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Profile Header */}
            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Avatar */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-3xl font-bold text-white">
              {initials}
            </div>
              {/* Name and role */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {displayName || profileData.email}
                    </h1>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                        <Briefcase className="h-3 w-3" />
                        {profileData.role === "admin" ? "Administrator" : "Staff"}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                        profileData.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      }`}>
                        {profileData.status}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <Button variant="ghost" onClick={() => router.push('/profile/edit')}>Edit Profile</Button>
                    <Button variant="outline" onClick={() => { logout(); router.push('/'); }}>Logout</Button>
                  </div>
                </div>
              </div>
          </div>

          <hr className="my-8 border-slate-200 dark:border-slate-800" />

          {/* Contact Information */}
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                Contact Information
              </h2>
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white break-all">
                      <a href={`mailto:${profileData.email}`} className="text-cyan-600 hover:underline">{profileData.email}</a>
                    </p>
                  </div>
                </div>

                {/* Phone */}
                {profileData.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        <a href={`tel:${profileData.phone}`} className="hover:underline">{profileData.phone}</a>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                Additional Information
              </h2>
              <div className="space-y-4">
                {/* National ID */}
                {profileData.national_id && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">National ID</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {profileData.national_id}
                    </p>
                  </div>
                )}

                {/* Date of Birth */}
                {profileData.date_of_birth && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Date of Birth</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {new Date(profileData.date_of_birth).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Member Since */}
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Member Since</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Forms pending section */}
          <hr className="my-8 border-slate-200 dark:border-slate-800" />
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              Your Forms
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You can fill out and submit your forms from the{" "}
              <Link href="/forms" className="text-cyan-600 hover:underline dark:text-cyan-400">
                Forms section
              </Link>
              {" "}in the dashboard.
            </p>
          </div>
          {/* Change Password */}
          <hr className="my-8 border-slate-200 dark:border-slate-800" />
          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Change Password</h2>
            <ChangePasswordForm token={token} />
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}

function ChangePasswordForm({ token }: { token: string | null }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Not authenticated");
      return;
    }
    if (!oldPassword || !newPassword) {
      setError("Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.apiPrefix}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to change password");
      } else {
        setSuccess("Password changed successfully");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Current password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Change password"}</Button>
        </div>
      </div>
    </form>
  );
}
