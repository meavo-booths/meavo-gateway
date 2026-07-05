import { resolveTeamColor } from "@/lib/team-colors";
import { UpdateTeamAllowanceForm, UpdateTeamForm } from "@/components/admin-create-forms";
import { Card } from "@/components/ui";

export type AdminTeam = {
  id: string;
  name: string;
  color: string;
  yearlyAllowance: number;
  members: {
    id: string;
    role: "MANAGER" | "MEMBER";
    user: { id: string; name: string | null; email: string };
  }[];
};

export function AdminTeamsList({ teams }: { teams: AdminTeam[] }) {
  if (teams.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">No teams yet. Create one on the Users page.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => (
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
            <UpdateTeamAllowanceForm teamId={team.id} yearlyAllowance={team.yearlyAllowance} />
          </div>

          <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Edit team name &amp; colour
            </summary>
            <UpdateTeamForm teamId={team.id} teamName={team.name} teamColor={team.color} />
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
      ))}
    </div>
  );
}
