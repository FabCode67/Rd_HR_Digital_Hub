"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Network,
  Building2,
  ListChecks,
  Users,
  BarChart3,
  Menu,
  X,
  CircleUserRound,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type DashboardShellProps = {
  children: React.ReactNode;
};

const baseNavItems = [
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/org", label: "Organization", icon: Network },
  { href: "/dashboard", label: "Departments", icon: Building2 },
  { href: "/dashboard/positions", label: "Positions", icon: LayoutDashboard },
  { href: "/dashboard/employees", label: "Employees", icon: Users },
  { href: "/dashboard/forms", label: "Forms", icon: ListChecks },
];

const adminNavItems = [
  { href: "/dashboard/staff", label: "Staff Management", icon: Users },
];

export default function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const sidebarWidthClass = collapsed ? "md:pl-16" : "md:pl-60";

  // Combine nav items based on user role
  const navItems = user?.role === "admin" ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Get user initials for avatar
  const userInitials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((word: string) => word[0])
        .join("")
        .toUpperCase()
    : "U";

  const renderNav = (compact: boolean, onNavigate?: () => void) => (
    <nav className="space-y-1 p-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:flex",
          "transition-all duration-200 ease-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          {!collapsed ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative h-7 w-12 overflow-hidden rounded-md bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-slate-700">
                <Image
                  src="/NCBA_LOGO_2.jpg"
                  alt="NCBA"
                  fill
                  sizes="48px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">NCBA HR</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Digital Hub</p>
              </div>
            </div>
          ) : (
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-slate-700">
              <Image
                src="/NCBA_LOGO_2.jpg"
                alt="NCBA"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {renderNav(collapsed)}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-slate-200 bg-white/95 backdrop-blur transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900/95 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative h-7 w-12 overflow-hidden rounded-md bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-slate-700">
              <Image
                src="/NCBA_LOGO_2.jpg"
                alt="NCBA"
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">NCBA HR</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Digital Hub</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {renderNav(false, () => setMobileOpen(false))}
      </aside>

      <div className={cn("flex min-h-screen flex-col", sidebarWidthClass)}>
        <div className="flex min-h-screen flex-col">
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Dashboard</p>
              </div>
              <div className="ml-1 hidden items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-cyan-700 sm:inline-flex dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300">
                NCBA
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-semibold text-white">
                  {userInitials}
                </span>
                <span className="hidden sm:inline">{user?.full_name || "Profile"}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  {user && (
                    <>
                      <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mt-1">
                          {user.role === "admin" ? "Administrator" : "Staff"}
                        </p>
                      </div>
                    </>
                  )}
                  <Link href="/profile">
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                      <CircleUserRound className="h-4 w-4" />
                      View Profile
                    </button>
                  </Link>
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}