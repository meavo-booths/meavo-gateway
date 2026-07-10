"use client";

import { useMemo, useState } from "react";
import {
  ChangeTeamModal,
  ManageAccessModal,
  ResetPasswordModal,
  type AdminUser,
  type CardOption,
  type TeamOption,
} from "@/components/admin-user-modals";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Button } from "@/components/ui";

type SortOrder = "asc" | "desc";
type TeamFilter = "all" | "none" | string;
type RoleFilter = "all" | "MANAGER" | "MEMBER" | "none";

function userDisplayName(user: AdminUser): string {
  return user.name ?? user.email;
}

function filterFieldClassName() {
  return "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
}

function AdminUserRow({
  user,
  teamOptions,
  cardOptions,
  canDelete,
  canGrantHr,
}: {
  user: AdminUser;
  teamOptions: TeamOption[];
  cardOptions: CardOption[];
  canDelete: boolean;
  canGrantHr: boolean;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const displayName = userDisplayName(user);
  const teamLabel = user.teamName
    ? `${user.teamName} · ${user.role === "MANAGER" ? "Manager" : "Member"}`
    : "No team assigned";

  return (
    <>
      <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{displayName}</p>
          {user.name && <p className="truncate text-sm text-slate-500">{user.email}</p>}
          <p className="mt-1 text-sm text-slate-500">{teamLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            {user.accessCardIds.length} tool{user.accessCardIds.length !== 1 ? "s" : ""} with access
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setAccessOpen(true)}>
            Manage access
          </Button>
          <Button type="button" variant="secondary" onClick={() => setTeamOpen(true)}>
            Change team
          </Button>
          <Button type="button" variant="secondary" onClick={() => setResetOpen(true)}>
            Reset password
          </Button>
          {canDelete && (
            <DeleteUserButton
              userId={user.id}
              userLabel={user.name ? `${user.name} (${user.email})` : user.email}
            />
          )}
        </div>
      </li>

      <ManageAccessModal
        user={user}
        displayName={displayName}
        cardOptions={cardOptions}
        canGrantHr={canGrantHr}
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
      />
      <ChangeTeamModal
        user={user}
        displayName={displayName}
        teamOptions={teamOptions}
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
      />
      <ResetPasswordModal
        userId={user.id}
        displayName={displayName}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />
    </>
  );
}

export function AdminUsersList({
  users,
  teamOptions,
  cardOptions,
  currentUserId,
  canGrantHr,
}: {
  users: AdminUser[];
  teamOptions: TeamOption[];
  cardOptions: CardOption[];
  currentUserId: string;
  canGrantHr: boolean;
}) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const visibleUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      if (teamFilter === "none") {
        if (user.teamId) return false;
      } else if (teamFilter !== "all" && user.teamId !== teamFilter) {
        return false;
      }

      if (roleFilter === "none") {
        if (user.role) return false;
      } else if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const comparison = userDisplayName(a).localeCompare(userDisplayName(b), undefined, {
        sensitivity: "base",
      });
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [users, sortOrder, teamFilter, roleFilter]);

  if (users.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No users yet.</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Sort by name</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            className={filterFieldClassName()}
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Team</span>
          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className={filterFieldClassName()}
          >
            <option value="all">All teams</option>
            <option value="none">No team</option>
            {teamOptions.map((team) => (
              <option key={team.value} value={team.value}>
                {team.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Team role</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className={filterFieldClassName()}
          >
            <option value="all">All roles</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
            <option value="none">No role</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-slate-500">
        Showing {visibleUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""}
      </p>

      {visibleUsers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No users match the current filters.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <ul className="divide-y divide-slate-100 bg-white">
            {visibleUsers.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                teamOptions={teamOptions}
                cardOptions={cardOptions}
                canDelete={user.id !== currentUserId}
                canGrantHr={canGrantHr}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
