import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTeamColor } from "@/lib/team-colors";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      teamMembers: {
        orderBy: { team: { name: "asc" } },
        select: {
          role: true,
          team: { select: { name: true, color: true } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const teams = user.teamMembers.map(({ role, team }) => ({
    name: team.name,
    color: resolveTeamColor(team.color),
    role,
  }));

  return (
    <div className="max-w-4xl">
      <PageHeader title="Profile" description="Manage your display name and password." />
      <ProfileForm email={user.email} name={user.name} image={user.image} teams={teams} />
    </div>
  );
}
