import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LibraryNav } from "@/components/library-nav";
import { PageHeader } from "@/components/ui";

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Shared dashboards and reference materials for the team."
      />
      <LibraryNav />
      {children}
    </div>
  );
}
