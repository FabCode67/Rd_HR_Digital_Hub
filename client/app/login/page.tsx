"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const currentUser = await login(email, password);
      // Redirect admin users to dashboard, staff to profile page
      const role = currentUser.role;
      if (role === "admin") {
        router.push("/dashboard");
      } else {
        router.push("/staff");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-28 top-56 h-[24rem] w-[24rem] rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[22rem] w-[22rem] rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo */}
          <Link href="/" className="mb-8 flex flex-col items-center gap-3">
            <div className="relative h-14 w-36 overflow-hidden rounded-xl bg-white p-1.5 shadow-md">
              <Image
                src="/NCBA_LOGO_2.jpg"
                alt="NCBA"
                fill
                sizes="144px"
                className="object-contain"
                priority
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">HR Digital Hub · Rwanda</p>
            </div>
          </Link>

          {/* Title */}
          <h1 className="text-center text-2xl font-bold text-white mb-2">NCBA HR Hub</h1>
          <p className="text-center text-sm text-slate-300 mb-6">Sign in to your account</p>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo credentials info */}
          <div className="mt-6 rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
            <p className="text-xs font-semibold text-blue-300 mb-1">Demo Credentials</p>
            <p className="text-xs text-blue-200">
              <strong>Admin:</strong> admin@example.com / AdminPass123!
            </p>
            <p className="text-xs text-blue-200">
              <strong>Staff:</strong> Use credentials provided by admin
            </p>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Contact your administrator if you need assistance
          </p>
        </div>
      </div>
    </div>
  );
}
