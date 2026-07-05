import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { PageHeader } from "@/components/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.systemRole !== "ADMIN") redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" description="Manage users, teams, tool cards, and access." />
      <AdminNav />
      {children}
    </div>
  );
}
