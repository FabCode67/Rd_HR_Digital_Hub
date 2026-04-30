export const metadata = {
  title: "Analytics - Rwanda HR Digital Hub",
  description: "Analytics overview",
};

export default function AnalyticsPage() {
  return (
    <section className="space-y-4 min-w-0">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Departments</p>
          <p className="mt-1 text-2xl font-semibold">--</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Positions</p>
          <p className="mt-1 text-2xl font-semibold">--</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Vacancies</p>
          <p className="mt-1 text-2xl font-semibold">--</p>
        </div>
      </div>
    </section>
  );
}