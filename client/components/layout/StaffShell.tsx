"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { User, FileText, LogOut, Sun, Moon, Menu, X, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/staff",       label: "My Profile", icon: User,     exact: true },
  { href: "/staff/forms", label: "My Forms",   icon: FileText, exact: false },
];

export default function StaffShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const initials = user?.full_name
    ? user.full_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "U");

  const handleLogout = () => { logout(); router.push("/login"); };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-cyan-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}

      <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" />

      <button
        onClick={() => { onClick?.(); handleLogout(); }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-all"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Sidebar (desktop) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="relative h-9 w-20 shrink-0 overflow-hidden rounded-md bg-white dark:bg-slate-100">
            <Image src="/NCBA_LOGO_2.jpg" alt="NCBA" fill sizes="80px" className="object-contain" priority />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">NCBA HR</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Staff Portal</p>
          </div>
        </div>

        {/* User card */}
        <div className="m-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 p-3 dark:from-cyan-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.full_name || "Staff"}
              </p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>

        <NavLinks />

        {/* Theme toggle at bottom */}
        <div className="mt-auto border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile sidebar ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform duration-200 md:hidden",
        mobileOpen ? "flex translate-x-0" : "flex -translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-20 shrink-0 overflow-hidden rounded-md bg-white dark:bg-slate-100">
              <Image src="/NCBA_LOGO_2.jpg" alt="NCBA" fill sizes="80px" className="object-contain" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Staff Portal</span>
          </div>
          <button onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavLinks onClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main ── */}
      <div className="flex min-h-screen flex-col md:pl-56">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? "Staff Portal"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(isDark ? "light" : "dark")}
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
