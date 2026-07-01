import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { getHomeRevenueStats } from "@/lib/revenue-stats";
import { getToolCardStatsMap } from "@/lib/tool-card-stats";
import { RevenueSummaryCard } from "@/components/revenue-summary-card";
import { ToolCardTile } from "@/components/tool-card-tile";
import { Card, PageHeader } from "@/components/ui";

export const revalidate = 300;

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin(session.user.id);

  const cards = admin
    ? await prisma.toolCard.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    : await prisma.toolCard.findMany({
        where: {
          isActive: true,
          access: { some: { userId: session.user.id } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });

  const [revenueStats, statsByKey] = await Promise.all([
    getHomeRevenueStats(),
    getToolCardStatsMap(cards.map((card) => card.linkedAppKey)),
  ]);

  return (
    <div>
      <PageHeader
        title="Meavo tools"
        description="Open the apps and tools you have access to."
      />

      <div className="mb-6">
        <RevenueSummaryCard stats={revenueStats} />
      </div>

      {cards.length === 0 ? (
        <Card>
          <p className="text-slate-600">
            No tools available yet. Contact your admin if you need access.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <ToolCardTile
              key={card.id}
              name={card.name}
              description={card.description}
              url={card.url}
              iconKey={card.iconKey}
              stats={card.linkedAppKey ? statsByKey.get(card.linkedAppKey) ?? null : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
