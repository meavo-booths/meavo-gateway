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
        description="Shared dashboards, culture reference, and team materials."
      >
        {actions}
      </PageHeader>
      <LibraryNav />
      {children}
    </div>
  );
}
