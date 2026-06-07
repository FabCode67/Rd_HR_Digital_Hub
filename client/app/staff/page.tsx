"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import {
  Mail, Phone, Calendar, CreditCard, ShieldCheck,
  KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff,
  User, Loader2, Camera, Trash2,
} from "lucide-react";
import { API_CONFIG } from "@/lib/config";
import Image from "next/image";

// ─── helpers ──────────────────────────────────────────────────────────────────

function Field({ label, value, icon: Icon }: {
  label: string; value?: string | null; icon?: React.ElementType;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/40">
          <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200 break-all">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    ACTIVE:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    INACTIVE:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    SUSPENDED:  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  const cls = map[status ?? ""] ?? map.INACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "Unknown"}
    </span>
  );
}

// ─── Avatar upload ─────────────────────────────────────────────────────────────

function AvatarUpload({ userId, imageUrl, initials, onUploaded, token }: {
  userId: string;
  imageUrl?: string | null;
  initials: string;
  onUploaded: (url: string | null) => void;
  token: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<string | null>(imageUrl ?? null);
  const [error, setError]         = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only image files allowed."); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("File must be under 5 MB.");  return; }

    setError("");
    setUploading(true);
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const result = await apiClient.employee.uploadAvatar(userId, file, token ?? "");
      setPreview(result.profile_image_url);
      onUploaded(result.profile_image_url);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
      setPreview(imageUrl ?? null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await apiClient.employee.deleteAvatar(userId);
      setPreview(null);
      onUploaded(null);
    } catch (err: any) {
      setError(err?.message || "Failed to remove");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar */}
      <div className="relative group">
        <div className="h-20 w-20 shrink-0 rounded-2xl overflow-hidden shadow-lg">
          {preview ? (
            <Image src={preview} alt="Profile" width={80} height={80}
              className="h-full w-full object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 text-3xl font-bold text-white">
              {initials}
            </div>
          )}
        </div>

        {/* Upload overlay on hover */}
        <button type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed">
          {uploading
            ? <Loader2 className="h-5 w-5 animate-spin text-white" />
            : <Camera className="h-5 w-5 text-white" />}
        </button>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors">
          <Camera className="h-3 w-3" /> {preview ? "Change" : "Upload"}
        </button>
        {preview && (
          <button type="button" onClick={handleRemove} disabled={uploading}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-60 transition-colors">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Password form ─────────────────────────────────────────────────────────────

function PasswordForm({ token }: { token: string | null }) {
  const [old, setOld]         = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld,  setShowOld]  = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [success, setSuccess]   = useState(false);

  const strength = (p: string) => {
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const str = strength(next);
  const strColor = ["bg-slate-200","bg-red-400","bg-amber-400","bg-yellow-400","bg-emerald-500"][str];
  const strLabel = ["","Weak","Fair","Good","Strong"][str];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!token)           { setError("Not authenticated"); return; }
    if (!old || !next)    { setError("Please fill all fields"); return; }
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.apiPrefix}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: old, new_password: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to change password");
      } else {
        setSuccess(true);
        setOld(""); setNext(""); setConfirm("");
      }
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
          Current Password
        </label>
        <div className="relative">
          <input type={showOld ? "text" : "password"} value={old} onChange={e => setOld(e.target.value)}
            className="field pr-10" placeholder="••••••••" />
          <button type="button" onClick={() => setShowOld(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)}
            className="field pr-10" placeholder="Min. 8 characters" />
          <button type="button" onClick={() => setShowNext(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {next && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= str ? strColor : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>
            <p className={`text-xs font-medium ${str >= 3 ? "text-emerald-600" : str === 2 ? "text-amber-600" : "text-red-500"}`}>
              {strLabel}
            </p>
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
          Confirm New Password
        </label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          className={`field ${confirm && confirm !== next ? "border-red-400 dark:border-red-600" : confirm && confirm === next ? "border-emerald-400 dark:border-emerald-600" : ""}`}
          placeholder="Repeat new password" />
        {confirm && confirm !== next && <p className="mt-1 text-xs text-red-500">Passwords don't match</p>}
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Password changed successfully!
        </div>
      )}
      <button type="submit" disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60 transition-colors">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {loading ? "Saving…" : "Update Password"}
      </button>
    </form>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function StaffProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(user?.profile_image_url ?? null);

  const initials = user?.full_name
    ? user.full_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const dob = user?.date_of_birth
    ? new Date(user.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const handleAvatarUpdate = (url: string | null) => {
    setImageUrl(url);
    if (updateUser) updateUser({ ...user, profile_image_url: url });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar with upload */}
          {user?.id ? (
            <AvatarUpload
              userId={user.id}
              imageUrl={imageUrl}
              initials={initials}
              onUploaded={handleAvatarUpdate}
              token={token}
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-3xl font-bold text-white shadow-lg">
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-slate-400">NCBA Staff Portal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight truncate">
              {user?.full_name || user?.email}
            </h1>
            <p className="mt-0.5 text-sm text-slate-300 truncate">{user?.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={user?.status} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                <User className="h-3 w-3" /> Staff Member
              </span>
              {memberSince && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  Since {memberSince}
                </span>
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Hover over avatar to change photo · Max 5 MB</p>
          </div>
        </div>
      </div>

      {/* ── Contact & Details ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/40">
              <Mail className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contact</h2>
          </div>
          <div className="space-y-4">
            <Field label="Email" value={user?.email} icon={Mail} />
            <Field label="Phone" value={user?.phone} icon={Phone} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <CreditCard className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Personal Details</h2>
          </div>
          <div className="space-y-4">
            <Field label="National ID" value={user?.national_id} icon={ShieldCheck} />
            <Field label="Date of Birth" value={dob ?? undefined} icon={Calendar} />
            {!user?.national_id && !dob && (
              <p className="text-xs text-slate-400 dark:text-slate-500">No personal details on file.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Account security ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account Security</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Update your password regularly to keep your account safe</p>
          </div>
        </div>
        <PasswordForm token={token} />
      </div>
    </div>
  );
}
