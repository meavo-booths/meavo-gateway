import { ensureCompanyProfiles } from "@/lib/company-profiles";
import { prisma } from "@/lib/prisma";
import { HrCompanyProfiles } from "@/components/hr-company-profiles";
import {
  HrDocumentTemplates,
  type DocumentTemplateListItem,
} from "@/components/hr-document-templates";

export default async function HrDocumentationPage() {
  const [profiles, templates, users] = await Promise.all([
    ensureCompanyProfiles(),
    prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          select: {
            id: true,
            versionNumber: true,
            body: true,
            createdAt: true,
            isCurrent: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
  ]);

  const templateRows: DocumentTemplateListItem[] = templates
    .map((template) => {
      const currentVersion =
        template.versions.find((version) => version.isCurrent) ?? template.versions[0];
      if (!currentVersion) return null;
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        versionCount: template.versions.length,
        currentVersion: {
          id: currentVersion.id,
          versionNumber: currentVersion.versionNumber,
          body: currentVersion.body,
          createdAt: currentVersion.createdAt.toISOString(),
        },
      };
    })
    .filter((row): row is DocumentTemplateListItem => row !== null);

  const userOptions = users.map((user) => ({
    id: user.id,
    label: user.name ? `${user.name} (${user.email})` : user.email,
  }));

  return (
    <div className="space-y-8">
      <HrCompanyProfiles profiles={profiles} />
      <HrDocumentTemplates templates={templateRows} users={userOptions} />
    </div>
  );
}
