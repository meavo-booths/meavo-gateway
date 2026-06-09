import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { resolveTeamColor } from "@/lib/team-colors";
import {
  createTeam,
  createToolCard,
  createUser,
  updateTeam,
  updateTeamAllowance,
} from "@/app/actions/admin";
import { AdminToolCards } from "@/components/admin-tool-cards";
import { AdminUsersList } from "@/components/admin-users-list";
import { TeamColorPicker } from "@/components/team-color-picker";
import { Button, Card, Input, PageHeader, Select, Textarea } from "@/components/ui";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isAdmin(session.user.id))) redirect("/");

  const [teams, users, cards] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
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
      include: {
        access: { select: { userId: true } },
      },
    }),
  ]);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const adminUsers = users.map((user) => {
    const membership = user.teamMembers[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      teamId: membership?.teamId ?? null,
      teamName: membership?.team.name ?? null,
      role: membership?.role ?? null,
      accessCardIds: user.cardAccess.map((a) => a.cardId),
    };
  });

  const userOptions = users.map((user) => ({
    id: user.id,
    label: user.name ? `${user.name} (${user.email})` : user.email,
  }));

  const cardOptions = cards.map((card) => ({
    id: card.id,
    label: card.name,
  }));

  const toolCards = cards.map((card) => ({
    id: card.id,
    name: card.name,
    description: card.description,
    url: card.url,
    accessUserIds: card.access.map((a) => a.userId),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin"
        description="Manage users, teams, tool cards, and access."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Create user</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add employee accounts with email and password.
          </p>
          {teamOptions.length === 0 ? (
            <p className="mt-4 text-sm text-amber-700">Create a team before adding users.</p>
          ) : (
            <form action={createUser} className="mt-4 space-y-4">
              <Input label="Email" name="email" type="email" required />
              <Input label="Name" name="name" placeholder="Jane Smith" />
              <Input
                label="Password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
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
              <Button type="submit">Create user</Button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Create team</h2>
          <form action={createTeam} className="mt-4 space-y-4">
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
        />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Create tool card</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add a new app or tool to the dashboard.
        </p>
        <form action={createToolCard} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Name" name="name" required placeholder="Vacation Tracker" />
          <Input label="Link URL" name="url" type="url" required placeholder="https://..." />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              name="description"
              required
              placeholder="What this tool is for"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create card</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Tool cards</h2>
        <p className="mt-1 text-sm text-slate-500">
          Edit cards and grant access to users.
        </p>
        <AdminToolCards cards={toolCards} users={userOptions} />
      </Card>

      <div className="space-y-4">
        {teams.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No teams yet.</p>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 shrink-0 rounded"
                      style={{ backgroundColor: resolveTeamColor(team.color) }}
                    />
                    <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                  </div>
                  <p className="text-sm text-slate-500">
                    Default allowance: {team.yearlyAllowance} days/year
                  </p>
                </div>
                <form
                  action={async (formData) => {
                    "use server";
                    await updateTeamAllowance(team.id, Number(formData.get("yearlyAllowance")));
                  }}
                  className="flex items-end gap-2"
                >
                  <Input
                    label="Update allowance"
                    name="yearlyAllowance"
                    type="number"
                    defaultValue={team.yearlyAllowance}
                    min={0}
                  />
                  <Button type="submit" variant="secondary">
                    Save
                  </Button>
                </form>
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Edit team name &amp; colour
                </summary>
                <form action={updateTeam} className="mt-4 space-y-4">
                  <input type="hidden" name="teamId" value={team.id} />
                  <Input label="Team name" name="name" defaultValue={team.name} required />
                  <TeamColorPicker defaultColor={team.color} />
                  <Button type="submit" variant="secondary">
                    Save changes
                  </Button>
                </form>
              </details>

              {team.members.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No members yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {team.members.map((member) => (
                    <li key={member.id} className="py-3 text-sm text-slate-700">
                      {member.user.name ?? member.user.email}{" "}
                      <span className="text-slate-400">
                        ({member.role === "MANAGER" ? "Manager" : "Member"})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
