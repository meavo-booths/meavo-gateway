import { redirect } from "next/navigation";
import { UsefulLinkCreateForm } from "@/components/useful-link-create-form";
import { UsefulLinksGrid } from "@/components/useful-links-grid";
import { LibrarySection } from "@/components/library-section";
import { Card } from "@/components/ui";
import { auth } from "@/lib/auth";
import { canManageUsefulLinks } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsefulLinksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const canManage = await canManageUsefulLinks(session.user.id);

  const links = await prisma.usefulLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      url: true,
      iconKey: true,
    },
  });

  return (
    <LibrarySection>
      <div className="space-y-8">
        {canManage && (
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Add a link</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a bookmark tile with a name, description, HTTPS URL, and optional icon.
                  </p>
                </div>
                <svg
                  className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <UsefulLinkCreateForm />
            </details>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Useful links</h2>
          <p className="mt-1 text-sm text-slate-500">
            Shared bookmarks and resources for the team.
          </p>
          <div className="mt-4">
            <UsefulLinksGrid links={links} canManage={canManage} />
          </div>
        </div>
      </div>
    </LibrarySection>
  );
}
