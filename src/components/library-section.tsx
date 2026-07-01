import { ReactNode } from "react";
import { LibraryNav } from "@/components/library-nav";

export function LibrarySection({
  toolbar,
  children,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {toolbar ? <div className="flex justify-end">{toolbar}</div> : null}
      <LibraryNav />
      {children}
    </div>
  );
}
