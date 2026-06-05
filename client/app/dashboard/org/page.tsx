import DepartmentTree from "@/components/org-tree/DepartmentTree";

export const metadata = {
  title: "Organization Structure - Rwanda HR Digital Hub",
  description: "View the hierarchical structure of all departments and positions",
};

export default function OrgPage() {
  return (
    <section className="space-y-4 min-w-0">
      <DepartmentTree />
    </section>
  );
}
