"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api";
import { Department, Employee, Position, PositionLevel } from "@/lib/types";
import { Loader2, ArrowUpRight, Building2, BriefcaseBusiness, Users, BadgeCheck } from "lucide-react";

const PAGE_SIZE = 100;

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: string;
};

type BarDatum = {
  label: string;
  value: number;
  color: string;
};

async function fetchAllPages<T>(loader: (skip: number, limit: number) => Promise<T[]>): Promise<T[]> {
  let skip = 0;
  const items: T[] = [];

  while (true) {
    const batch = await loader(skip, PAGE_SIZE);
    items.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    skip += PAGE_SIZE;
  }

  return items;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function MetricCard({ label, value, detail, icon, accent }: MetricCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`h-1.5 w-full rounded-full ${accent}`} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{value}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatBarChart({ title, subtitle, data }: { title: string; subtitle: string; data: BarDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <ArrowUpRight className="h-5 w-5 text-slate-400" />
      </div>

      <div className="space-y-4">
        {data.length > 0 ? (
          data.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                <span className="text-slate-500 dark:text-slate-400">{item.value}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-3 rounded-full ${item.color} transition-all duration-300`}
                  style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No data available yet.</p>
        )}
      </div>
    </div>
  );
}

function DonutCard({
  title,
  subtitle,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  primaryColor,
  secondaryColor,
}: {
  title: string;
  subtitle: string;
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const total = Math.max(primary + secondary, 1);
  const primaryPct = (primary / total) * 100;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div
          className="mx-auto h-44 w-44 rounded-full"
          style={{
            background: `conic-gradient(${primaryColor} 0 ${primaryPct}%, ${secondaryColor} ${primaryPct}% 100%)`,
          }}
        >
          <div className="m-6 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner dark:bg-slate-950">
            <p className="text-3xl font-semibold text-slate-950 dark:text-slate-50">{formatPercent(primaryPct)}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{primaryLabel}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:min-w-56">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="font-medium text-slate-700 dark:text-slate-200">{primaryLabel}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{primary}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
              <span className="font-medium text-slate-700 dark:text-slate-200">{secondaryLabel}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{secondary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [departmentData, positionData, employeeData] = await Promise.all([
          fetchAllPages((skip, limit) => apiClient.department.getAll(skip, limit)),
          fetchAllPages((skip, limit) => apiClient.position.getAll(undefined, skip, limit)),
          fetchAllPages((skip, limit) => apiClient.employee.getAll(skip, limit)),
        ]);

        if (!mounted) {
          return;
        }

        setDepartments(departmentData);
        setPositions(positionData);
        setEmployees(employeeData);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const analytics = useMemo(() => {
    const activeDepartments = departments.filter((department) => department.is_active).length;
    const rootDepartments = departments.filter((department) => !department.parent_id).length;
    const activePositions = positions.filter((position) => position.is_active).length;
    const vacantPositions = positions.filter((position) => position.is_vacant).length;
    const filledPositions = Math.max(positions.length - vacantPositions, 0);
    const activeEmployees = employees.filter((employee) => employee.status === "ACTIVE").length;
    const inactiveEmployees = Math.max(employees.length - activeEmployees, 0);
    const fillRate = positions.length > 0 ? (filledPositions / positions.length) * 100 : 0;

    const departmentPositionMap = new Map<string, number>();
    positions.forEach((position) => {
      departmentPositionMap.set(position.department_id, (departmentPositionMap.get(position.department_id) ?? 0) + 1);
    });

    const topDepartments = [...departmentPositionMap.entries()]
      .map(([departmentId, count]) => ({
        departmentId,
        label: departments.find((department) => department.id === departmentId)?.name ?? "Unknown",
        value: count,
        color: "bg-emerald-500",
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);

    const levelOrder: PositionLevel[] = [
      "Director",
      "Head",
      "Manager",
      "Senior Manager",
      "Assistant Manager",
      "Officer",
      "Graduate Trainee",
      "Intern",
    ];

    const levelTotals = levelOrder
      .map((level, index) => ({
        label: level,
        value: positions.filter((position) => position.level === level).length,
        color:
          index === 0
            ? "bg-sky-600"
            : index === 1
              ? "bg-indigo-600"
              : index === 2
                ? "bg-teal-600"
                : "bg-slate-500",
      }))
      .filter((item) => item.value > 0);

    const employeeStatusData = [
      { label: "Active", value: activeEmployees, color: "bg-emerald-500" },
      { label: "Inactive", value: inactiveEmployees, color: "bg-amber-500" },
    ];

    return {
      activeDepartments,
      rootDepartments,
      activePositions,
      vacantPositions,
      filledPositions,
      activeEmployees,
      inactiveEmployees,
      fillRate,
      topDepartments,
      levelTotals,
      employeeStatusData,
    };
  }, [departments, employees, positions]);

  return (
    <section className="space-y-6 min-w-0">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl dark:border-slate-800">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Analytics</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Organization overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Key structural metrics, vacancy signals, and organizational mix at a glance.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            Live summary from departments, positions, and employees
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-slate-500" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading analytics…</span>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              label="Departments"
              value={departments.length.toString()}
              detail={`${analytics.rootDepartments} root units`}
              icon={<Building2 className="h-5 w-5" />}
              accent="bg-sky-500"
            />
            <MetricCard
              label="Positions"
              value={positions.length.toString()}
              detail={`${analytics.activePositions} active roles`}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              accent="bg-indigo-500"
            />
            <MetricCard
              label="Employees"
              value={employees.length.toString()}
              detail={`${analytics.activeEmployees} active records`}
              icon={<Users className="h-5 w-5" />}
              accent="bg-emerald-500"
            />
            <MetricCard
              label="Fill rate"
              value={formatPercent(analytics.fillRate)}
              detail={`${analytics.filledPositions} filled positions`}
              icon={<BadgeCheck className="h-5 w-5" />}
              accent="bg-amber-500"
            />
            <MetricCard
              label="Vacancies"
              value={analytics.vacantPositions.toString()}
              detail={`${positions.length > 0 ? formatPercent((analytics.vacantPositions / positions.length) * 100) : "0%"} of roles open`}
              icon={<ArrowUpRight className="h-5 w-5" />}
              accent="bg-rose-500"
            />
            <MetricCard
              label="Inactive employees"
              value={analytics.inactiveEmployees.toString()}
              detail="Requires attention"
              icon={<Users className="h-5 w-5" />}
              accent="bg-slate-500"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DonutCard
              title="Position occupancy"
              subtitle="Filled versus vacant roles in the current dataset"
              primary={analytics.filledPositions}
              secondary={analytics.vacantPositions}
              primaryLabel="Filled"
              secondaryLabel="Vacant"
              primaryColor="#0f766e"
              secondaryColor="#e11d48"
            />

            <StatBarChart
              title="Top departments by positions"
              subtitle="Where the largest concentration of roles sits"
              data={analytics.topDepartments}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatBarChart
              title="Position level distribution"
              subtitle="Headcount concentration by role level"
              data={analytics.levelTotals}
            />

            <StatBarChart
              title="Employee status mix"
              subtitle="Quick look at active versus inactive employee records"
              data={analytics.employeeStatusData}
            />
          </div>
        </>
      )}
    </section>
  );
}