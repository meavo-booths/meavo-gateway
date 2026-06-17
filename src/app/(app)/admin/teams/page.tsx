import { prisma } from "@/lib/prisma";
import { AdminTeamsList } from "@/components/admin-teams-list";

export default async function AdminTeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return (
    <div>
      <AdminTeamsList teams={teams} />
    </div>
  );
}
