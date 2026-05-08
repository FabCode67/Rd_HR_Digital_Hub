import FormManagement from "@/components/forms/FormManagement";

export const metadata = {
  title: "Forms Management - Rwanda HR Digital Hub",
  description: "Create and manage customizable forms",
};

export default function FormsPage() {
  return (
    <section className="space-y-6 min-w-0">
      <FormManagement />
    </section>
  );
}