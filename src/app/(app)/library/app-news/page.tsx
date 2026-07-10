import { redirect } from "next/navigation";
import { AppNewsComposeButton, AppNewsDeleteButton } from "@/components/app-news-admin";
import { LibrarySection } from "@/components/library-section";
import { Card } from "@/components/ui";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { templateMarkupToPreviewHtml } from "@/lib/template-markup";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function AppNewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const admin = await isAdmin(session.user.id);

  const announcements = await prisma.appAnnouncement.findMany({
    orderBy: { publishedAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <LibrarySection actions={admin ? <AppNewsComposeButton /> : null}>
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No announcements yet.</p>
          </Card>
        ) : null}

        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">{announcement.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(announcement.publishedAt)}
                  {announcement.createdBy
                    ? ` · ${announcement.createdBy.name ?? announcement.createdBy.email}`
                    : ""}
                </p>
              </div>
              {admin ? (
                <AppNewsDeleteButton id={announcement.id} title={announcement.title} />
              ) : null}
            </div>
            <div
              className="mt-3 text-sm leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{
                __html: templateMarkupToPreviewHtml(announcement.body),
              }}
            />
          </Card>
        ))}
      </div>
    </LibrarySection>
  );
}
