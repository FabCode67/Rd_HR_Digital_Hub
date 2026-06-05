"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, ChartNoAxesCombined, ShieldCheck, Users, FileText, Network, BarChart3, LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

// ── Stats ──────────────────────────────────────────────────────────────────────
const stats = [
  { value: "360°", label: "Org Visibility" },
  { value: "Real-time", label: "Analytics" },
  { value: "Role-based", label: "Access Control" },
  { value: "Digital", label: "Form Signing" },
]

// ── Feature cards ──────────────────────────────────────────────────────────────
const features = [
  {
    icon: Network,
    title: "Org Chart",
    desc: "Interactive department and position hierarchy with live vacancy tracking.",
    accent: "#06b6d4",
  },
  {
    icon: Users,
    title: "Employee Hub",
    desc: "Manage the full employee lifecycle — from onboarding to position history.",
    accent: "#8b5cf6",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Recharts-powered dashboards: headcount, fill rates, growth trends.",
    accent: "#10b981",
  },
  {
    icon: FileText,
    title: "Digital Forms",
    desc: "Assign, track and collect signed compliance forms with signature pads.",
    accent: "#f59e0b",
  },
  {
    icon: ShieldCheck,
    title: "Role Security",
    desc: "Admin and staff portals with JWT auth, protected routes, and audit trails.",
    accent: "#f43f5e",
  },
  {
    icon: Building2,
    title: "Departments",
    desc: "Multi-level department trees with parent/child relationships and metadata.",
    accent: "#0ea5e9",
  },
]

export default function Page() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  const displayName = user?.full_name || user?.email?.split("@")[0] || ""

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
      </div>
    )
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050810] text-white selection:bg-cyan-400/30">

      {/* ── Background atmosphere ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute right-[-15%] top-[30%] h-[500px] w-[500px] rounded-full bg-violet-500/6 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-500/6 blur-[100px]" />
        {/* Fine grain texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      </div>

      {/* ── Nav ── */}
      <nav className={`fixed top-0 z-50 w-full transition-all duration-500 ${scrolled ? "border-b border-white/8 bg-[#050810]/90 backdrop-blur-xl" : ""}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-20 overflow-hidden rounded-md bg-white">
              <Image src="/NCBA_LOGO_2.jpg" alt="NCBA" fill sizes="80px" className="object-contain" priority />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">HR Digital Hub</p>
              <p className="text-[9px] tracking-[0.15em] text-slate-500 uppercase">Rwanda</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden items-center gap-8 text-[13px] tracking-wide text-slate-400 md:flex">
            {["Features", "Analytics", "Security"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="transition-colors hover:text-cyan-300">{l}</a>
            ))}
          </div>

          {/* Auth area */}
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(s => !s)}
                className="flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-sm text-slate-200 backdrop-blur transition hover:bg-white/10">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-white">
                  {displayName[0]?.toUpperCase()}
                </span>
                {displayName}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur">
                  <div className="border-b border-white/8 px-4 py-3">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="truncate text-sm font-medium text-white">{user?.email}</p>
                  </div>
                  {[
                    { label: "My Profile", href: "/staff" },
                    { label: "My Forms", href: "/staff/forms" },
                    ...(user?.role === "admin" ? [{ label: "Dashboard", href: "/dashboard" }] : []),
                  ].map(({ label, href }) => (
                    <button key={label} onClick={() => { setMenuOpen(false); router.push(href) }}
                      className="flex w-full items-center px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-white/8">
                    <button onClick={() => { setMenuOpen(false); logout(); router.push("/") }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-950/30">
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Sign In <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative mx-auto max-w-7xl px-6 pb-24 pt-36 lg:px-10 lg:pt-44">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_420px]">

          {/* Left copy */}
          <div className="space-y-8">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                NCBA Rwanda · Workforce Platform
              </span>
            </div>

            <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              HR operations,{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  reimagined
                </span>
                <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-cyan-400/60 to-transparent" />
              </span>
              {" "}for modern banking.
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-slate-300/80">
              A unified platform for organizational structure, employee management,
              digital forms, and real-time workforce analytics — built exclusively
              for NCBA Rwanda.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login"
                className="group inline-flex items-center gap-2.5 rounded-full bg-cyan-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_32px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_48px_rgba(6,182,212,0.4)]">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#features"
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200">
                Explore features <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 border-t border-white/8 pt-8">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="mt-0.5 text-xs tracking-wide text-slate-500 uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual card stack */}
          <div className="relative hidden lg:block">
            {/* Glow behind */}
            <div className="absolute inset-0 rounded-3xl bg-cyan-400/5 blur-3xl" />

            {/* Main card */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 backdrop-blur-xl">
              {/* Top image */}
              <div className="relative h-52 w-full overflow-hidden">
                <Image src="/ncba.jpg" alt="NCBA office" fill sizes="420px" className="object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/80" />
                {/* Floating badge */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[11px] font-semibold text-white">System Online</span>
                </div>
              </div>

              {/* Metric cards inside */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {[
                  { label: "Active Staff", value: "Live" },
                  { label: "Forms Signed", value: "Digital" },
                  { label: "Departments", value: "Tracked" },
                  { label: "Analytics", value: "Real-time" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/4 p-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
                    <p className="mt-1 text-base font-bold text-cyan-300">{value}</p>
                  </div>
                ))}
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
                <div className="flex -space-x-2">
                  {["#06b6d4","#8b5cf6","#10b981","#f59e0b"].map((c, i) => (
                    <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 text-[10px] font-bold text-white" style={{ background: c }}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">HR team members</span>
              </div>
            </div>

            {/* Floating pill below */}
            <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-slate-900/60 px-4 py-3 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-[12px] text-slate-300">Role-based access · Admin & Staff portals</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      </div>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400">Platform Modules</p>
            <h2 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
              Everything HR needs,<br />in one place.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400 lg:text-right">
            Purpose-built modules that work together across the full employee
            and organizational lifecycle.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6 transition-all duration-300 hover:border-white/15 hover:bg-white/5"
                style={{ animationDelay: `${i * 80}ms` }}>
                {/* Hover glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: f.accent + "33" }} />
                <div className="mb-4 inline-flex rounded-xl p-2.5" style={{ background: f.accent + "18", border: `1px solid ${f.accent}30` }}>
                  <Icon className="h-5 w-5" style={{ color: f.accent }} />
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      </div>

      {/* ── Analytics highlight ── */}
      <section id="analytics" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-slate-900 to-[#050810]">
          <div className="grid lg:grid-cols-2">
            {/* Left */}
            <div className="flex flex-col justify-center p-10 lg:p-14">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-400">Analytics</p>
              <h2 className="text-3xl font-bold leading-tight text-white lg:text-4xl">
                Insights that drive<br />better HR decisions.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Interactive Recharts dashboards show headcount trends, department
                fill rates, vacancy ratios, employee status breakdowns, and
                6-month growth curves — all updated in real time.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Stacked bar charts by department",
                  "Line charts for headcount growth",
                  "Donut charts for vacancy & status",
                  "6 KPI cards with live counts",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-[10px]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {/* Right — abstract chart illustration */}
            <div className="relative hidden overflow-hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-slate-900/50" />
              <div className="absolute inset-0 flex items-end gap-3 p-10">
                {[65, 45, 82, 55, 90, 70, 48, 78].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full rounded-t-lg transition-all duration-700"
                      style={{
                        height: `${h * 2.2}px`,
                        background: i % 3 === 0
                          ? "linear-gradient(to top, #8b5cf6, #a78bfa)"
                          : i % 3 === 1
                          ? "linear-gradient(to top, #06b6d4, #67e8f9)"
                          : "linear-gradient(to top, #10b981, #6ee7b7)",
                        opacity: 0.7 + (i % 3) * 0.1,
                      }} />
                    <span className="text-[9px] text-slate-600">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"][i]}</span>
                  </div>
                ))}
              </div>
              {/* Floating card on chart */}
              <div className="absolute right-8 top-10 rounded-xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Fill Rate</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">87%</p>
                <p className="text-[10px] text-slate-500">↑ 4% this month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "JWT Auth",
              desc: "Secure token-based authentication with 7-day expiry and server-side validation on every request.",
              color: "#f43f5e",
            },
            {
              icon: Users,
              title: "Role Portals",
              desc: "Admins get the full dashboard. Staff get a clean personal portal. No cross-access, no leaks.",
              color: "#06b6d4",
            },
            {
              icon: FileText,
              title: "Digital Signatures",
              desc: "Canvas-based signature pads store hand-drawn signatures as base64 PNG alongside form answers.",
              color: "#10b981",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ background: color + "18", borderColor: color + "35" }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <h3 className="mb-2 font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-blue-950/40 p-12 text-center lg:p-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400">Get Started Today</p>
            <h2 className="mx-auto max-w-2xl text-4xl font-bold leading-tight text-white lg:text-5xl">
              Ready to modernize<br />NCBA HR operations?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-slate-400">
              Sign in with your NCBA credentials and access your personalized dashboard or staff portal instantly.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/login"
                className="group inline-flex items-center gap-2.5 rounded-full bg-cyan-400 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-300">
                Sign In to Hub
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-center sm:flex-row sm:text-left lg:px-10">
          <div className="flex items-center gap-3">
            <div className="relative h-6 w-14 overflow-hidden rounded bg-white">
              <Image src="/NCBA_LOGO_2.jpg" alt="NCBA" fill sizes="56px" className="object-contain" />
            </div>
            <span className="text-xs text-slate-500">HR Digital Hub · Rwanda</span>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} NCBA Rwanda. Internal platform — confidential.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <Link href="/login" className="transition hover:text-slate-300">Sign In</Link>
            <span className="text-slate-700">·</span>
            <span>v1.0</span>
          </div>
        </div>
      </footer>

    </main>
  )
}
