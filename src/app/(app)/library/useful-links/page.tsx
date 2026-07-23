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
            <h2 className="text-lg font-semibold text-slate-900">Add a link</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a bookmark tile with a name, description, HTTPS URL, and optional icon.
            </p>
            <UsefulLinkCreateForm />
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
