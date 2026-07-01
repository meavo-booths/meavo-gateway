import { ReactNode } from "react";
import { LibraryNav } from "@/components/library-nav";
import { PageHeader } from "@/components/ui";

export function LibrarySection({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Shared dashboards and reference materials for the team."
      >
        {actions}
      </PageHeader>
      <LibraryNav />
      {children}
    </div>
  );
}
