import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HrNav } from "@/components/hr-nav";
import { PageHeader } from "@/components/ui";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.hrAccess) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR"
        description="Confidential employee database. Access is restricted to HR users only."
      />
      <HrNav />
      {children}
    </div>
  );
}
