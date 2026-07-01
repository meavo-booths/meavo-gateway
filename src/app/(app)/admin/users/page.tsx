import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canGrantHrAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ToolCardKind } from "@prisma/client";
import { createTeam, createUser } from "@/app/actions/admin";
import { AdminUsersList } from "@/components/admin-users-list";
import { toolCardKindLabel } from "@/lib/tool-card-kind";
import { TeamColorPicker } from "@/components/team-color-picker";
import { Button, Card, Input, Select } from "@/components/ui";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const canGrantHr = await canGrantHrAccess(session.user.id);

  const [teams, users, cards] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        hrAccess: true,
        teamMembers: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { teamId: true, role: true, team: { select: { name: true } } },
        },
        cardAccess: { select: { cardId: true } },
      },
    }),
    prisma.toolCard.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true, linkedAppKey: true },
    }),
  ]);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  const cardOptions = cards.map((card) => ({
    id: card.id,
    label:
      card.kind === ToolCardKind.APP_ACCESS
        ? `${card.name} (${toolCardKindLabel(card.kind)})`
        : card.name,
  }));

  const adminUsers = users.map((user) => {
    const membership = user.teamMembers[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.systemRole === "ADMIN",
      hrAccess: user.hrAccess,
      teamId: membership?.teamId ?? null,
      teamName: membership?.team.name ?? null,
      role: membership?.role ?? null,
      accessCardIds: user.cardAccess.map((a) => a.cardId),
    };
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create user</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add employee accounts with email and password.
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
            {teamOptions.length === 0 ? (
              <p className="mt-4 text-sm text-amber-700">Create a team before adding users.</p>
            ) : (
              <form action={createUser} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <Input label="Email" name="email" type="email" required />
                <Input label="Name" name="name" placeholder="Jane Smith" />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Optional — leave blank for Google-only"
                />
                <Select label="Team" name="teamId" required options={teamOptions} />
                <Select
                  label="Team role"
                  name="role"
                  defaultValue="MEMBER"
                  options={[
                    { value: "MEMBER", label: "Member" },
                    { value: "MANAGER", label: "Manager" },
                  ]}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="makeAdmin" className="rounded border-slate-300" />
                  Admin access
                </label>
                {canGrantHr && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="grantHr" className="rounded border-slate-300" />
                    HR access
                  </label>
                )}
                <Button type="submit">Create user</Button>
              </form>
            )}
          </details>
        </Card>

        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create team</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a team with a default yearly holiday allowance.
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
            <form action={createTeam} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              <Input label="Team name" name="name" required placeholder="Engineering" />
              <Input
                label="Yearly allowance (days)"
                name="yearlyAllowance"
                type="number"
                defaultValue={25}
                min={0}
                required
              />
              <TeamColorPicker />
              <Button type="submit">Create team</Button>
            </form>
          </details>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Users</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage team assignments, tool access, passwords, and accounts.
        </p>
        <AdminUsersList
          users={adminUsers}
          teamOptions={teamOptions}
          cardOptions={cardOptions}
          currentUserId={session.user.id}
          canGrantHr={canGrantHr}
        />
      </Card>
    </div>
  );
}
