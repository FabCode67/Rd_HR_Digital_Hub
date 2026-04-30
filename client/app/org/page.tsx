import DepartmentTree from "@/components/org-tree/DepartmentTree";

export const metadata = {
  title: "Organization Structure - Rwanda HR Digital Hub",
  description: "View and manage the organizational hierarchy, departments, and positions",
};

export default function OrgPage() {
  return (
    <section className="space-y-4 min-w-0">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Organization</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Structure</p>
      </div>

      <DepartmentTree parentDepartmentId="e671f9d5-7a86-4abd-84ed-b09650640d7b" />
    </section>
  );
}
