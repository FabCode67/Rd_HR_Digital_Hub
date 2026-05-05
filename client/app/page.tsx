import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Building2, ChartNoAxesCombined, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

const valuePoints = [
  {
    title: "Organization Clarity",
    description:
      "Visualize department and position hierarchies with real-time updates across your structure.",
    icon: Building2,
  },
  {
    title: "HR Decision Intelligence",
    description:
      "Track workforce trends and operational metrics from one analytics-friendly platform.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Enterprise-Grade Security",
    description:
      "Built for regulated institutions with secure workflows, role controls, and audit-ready records.",
    icon: ShieldCheck,
  },
]

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -left-28 top-56 h-[24rem] w-[24rem] rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[22rem] w-[22rem] rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-16 pt-5 sm:px-8 lg:px-10">
        <header className="animate-rise border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl border px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-28 overflow-hidden rounded-md bg-white/90 p-1">
                <Image
                  src="/NCBA_LOGO_2.jpg"
                  alt="NCBA"
                  fill
                  
                  sizes="112px"
                  className="object-cover"
                  priority
                />
              </div>
              <span className="text-sm tracking-wide text-slate-100/90">
                HR Digital Hub
              </span>
            </div>

            <div className="hidden items-center gap-7 text-sm text-slate-100/80 md:flex">
              <a href="#value" className="transition hover:text-white">
                Value
              </a>
              <a href="#features" className="transition hover:text-white">
                Features
              </a>
              <a href="#experience" className="transition hover:text-white">
                Experience
              </a>
            </div>

            <Button
              asChild
              className="h-9 rounded-full bg-cyan-400 px-4 text-slate-950 hover:bg-cyan-300"
            >
              <Link href="/dashboard">Open Platform</Link>
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-10 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          <div className="space-y-7">
            <p className="animate-rise-delay-1 animate-rise inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-1 text-xs tracking-[0.18em] text-cyan-100 uppercase">
              Workforce Operating System
            </p>
            <h1 className="animate-rise-delay-2 animate-rise max-w-2xl text-balance text-4xl leading-tight [font-family:var(--font-heading)] sm:text-5xl lg:text-6xl">
              Designed for NCBA teams to lead with a sharper HR structure.
            </h1>
            <p className="animate-rise-delay-3 animate-rise max-w-xl text-lg leading-relaxed text-slate-200/85">
              A modern platform for employee data, organizational design, and
              position governance, built to support high-performance banking
              operations.
            </p>

            <div className="animate-rise-delay-3 animate-rise flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300"
              >
                <Link href="/dashboard" className="gap-2">
                  Launch Dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-white/25 bg-white/5 px-6 text-white hover:bg-white/10"
              >
                <Link href="/org">Explore Org View</Link>
              </Button>
            </div>
          </div>

          <div className="animate-rise-delay-2 animate-rise relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-slate-900/80 to-slate-950/70 p-3 shadow-[0_20px_80px_rgba(15,23,42,0.6)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative col-span-2 h-48 overflow-hidden rounded-2xl">
                  <Image
                    src="/ncba.jpg"
                    alt="NCBA workplace"
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-40 overflow-hidden rounded-2xl">
                  <Image
                    src="/download.webp"
                    alt="Digital systems"
                    fill
                    sizes="(max-width: 768px) 100vw, 272px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-40 overflow-hidden rounded-2xl">
                  <Image
                    src="/images.jpg"
                    alt="Team collaboration"
                    fill
                    sizes="(max-width: 768px) 100vw, 272px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
                <p className="text-xs tracking-[0.12em] text-cyan-100/80 uppercase">
                  Trusted by HR Leadership
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-3xl [font-family:var(--font-heading)]">99.9%</p>
                  <p className="text-sm text-slate-200/80">Platform reliability target</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="value" className="animate-rise-delay-3 animate-rise pb-14">
          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:grid-cols-3 md:p-6">
            {[
              "Single source of truth for staff and positions",
              "Scalable architecture for branch and head-office teams",
              "Fast workflows for approvals and operational oversight",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200/90">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="pb-16">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-3xl [font-family:var(--font-heading)] sm:text-4xl">
              Built for operational excellence.
            </h2>
            <p className="max-w-md text-sm text-slate-300/80">
              Clear modules for structure, talent, and performance in one
              connected NCBA experience.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {valuePoints.map((point, index) => {
              const Icon = point.icon

              return (
                <article
                  key={point.title}
                  className="animate-rise rounded-3xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl"
                  style={{ animationDelay: `${220 + index * 120}ms` }}
                >
                  <div className="mb-4 inline-flex rounded-xl border border-cyan-200/20 bg-cyan-200/10 p-2 text-cyan-100">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-xl [font-family:var(--font-heading)]">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200/80">
                    {point.description}
                  </p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="experience" className="animate-rise-delay-3 animate-rise">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-cyan-300/20 via-white/10 to-emerald-300/20 p-6 md:p-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs tracking-[0.18em] text-cyan-100 uppercase">
                  NCBA Product Experience
                </p>
                <h3 className="mt-2 max-w-xl text-2xl [font-family:var(--font-heading)] sm:text-3xl">
                  Create a cohesive HR operating model for every team.
                </h3>
              </div>
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300"
              >
                <Link href="/dashboard">Start With Dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
