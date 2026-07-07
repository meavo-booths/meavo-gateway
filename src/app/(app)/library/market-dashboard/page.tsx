import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LibrarySection } from "@/components/library-section";
import { LibraryUploadModal } from "@/components/library-upload-modal";
import { MarketDashboardPanel } from "@/components/market-dashboard-panel";
import { canReplaceMarketDashboard } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const SLUG = "market-dashboard";

export default async function MarketDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canUpload = await canReplaceMarketDashboard(session.user.id);

  const asset = await prisma.libraryAsset.upsert({
    where: { slug: SLUG },
    update: {},
    create: { slug: SLUG, title: "Marketing" },
    include: {
      uploadedBy: {
        select: { name: true, email: true },
      },
    },
  });

  const hasFile = Boolean(asset.storageKey);
  const uploadedByLabel = asset.uploadedBy
    ? asset.uploadedBy.name || asset.uploadedBy.email
    : null;

  return (
    <LibrarySection
      actions={
        canUpload ? (
          <LibraryUploadModal
            slug={SLUG}
            hasFile={hasFile}
            uploadMeta={
              hasFile
                ? {
                    fileName: asset.fileName,
                    updatedAt: asset.updatedAt.toISOString(),
                    uploadedByLabel,
                  }
                : null
            }
          />
        ) : null
      }
    >
      <MarketDashboardPanel slug={SLUG} hasFile={hasFile} />
    </LibrarySection>
  );
}
