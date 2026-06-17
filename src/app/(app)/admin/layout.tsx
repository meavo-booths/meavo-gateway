import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { AdminNav } from "@/components/admin-nav";
import { PageHeader } from "@/components/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isAdmin(session.user.id))) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" description="Manage users, teams, tool cards, and access." />
      <AdminNav />
      {children}
    </div>
  );
}
