"use client";

import { useState } from "react";
import { changeUserTeam, resetUserPassword, setUserAccess } from "@/app/actions/admin";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Button, Input, Select } from "@/components/ui";

type TeamOption = { value: string; label: string };
type CardOption = { id: string; label: string };

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  hrAccess: boolean;
  teamId: string | null;
  teamName: string | null;
  role: "MANAGER" | "MEMBER" | null;
  accessCardIds: string[];
};

function Modal({
  title,
  open,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl border border-slate-200 bg-white p-6 shadow-lg ${wide ? "max-w-md" : "max-w-sm"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AdminUserRow({
  user,
  teamOptions,
  cardOptions,
  canDelete,
}: {
  user: AdminUser;
  teamOptions: TeamOption[];
  cardOptions: CardOption[];
  canDelete: boolean;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const displayName = user.name ?? user.email;
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

      <Modal
        title={`Access — ${displayName}`}
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        wide
      >
        <form action={setUserAccess} className="space-y-4" onSubmit={() => setAccessOpen(false)}>
          <input type="hidden" name="userId" value={user.id} />
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">Privileges</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="makeAdmin"
                defaultChecked={user.isAdmin}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
              />
              <span>Admin access</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="grantHr"
                defaultChecked={user.hrAccess}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
              />
              <span>HR access</span>
            </label>
          </div>
          <p className="text-sm text-slate-600">
            Select tools this user can see on the dashboard.
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {cardOptions.length === 0 ? (
              <p className="text-sm text-slate-500">No tool cards yet.</p>
            ) : (
              cardOptions.map((card) => (
                <label key={card.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="cardId"
                    value={card.id}
                    defaultChecked={user.accessCardIds.includes(card.id)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                  />
                  <span>{card.label}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAccessOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save access</Button>
          </div>
        </form>
      </Modal>

      <Modal title={`Change team — ${displayName}`} open={teamOpen} onClose={() => setTeamOpen(false)}>
        <form action={changeUserTeam} className="space-y-4" onSubmit={() => setTeamOpen(false)}>
          <input type="hidden" name="userId" value={user.id} />
          <Select
            label="Team"
            name="teamId"
            required
            defaultValue={user.teamId ?? teamOptions[0]?.value}
            options={teamOptions}
          />
          <Select
            label="Role"
            name="role"
            defaultValue={user.role ?? "MEMBER"}
            options={[
              { value: "MEMBER", label: "Member" },
              { value: "MANAGER", label: "Manager" },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Reset password — ${displayName}`}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      >
        <form action={resetUserPassword} className="space-y-4" onSubmit={() => setResetOpen(false)}>
          <input type="hidden" name="userId" value={user.id} />
          <Input
            label="New password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Reset password</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdminUsersList({
  users,
  teamOptions,
  cardOptions,
  currentUserId,
}: {
  users: AdminUser[];
  teamOptions: TeamOption[];
  cardOptions: CardOption[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No users yet.</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <ul className="divide-y divide-slate-100 bg-white">
        {users.map((user) => (
          <AdminUserRow
            key={user.id}
            user={user}
            teamOptions={teamOptions}
            cardOptions={cardOptions}
            canDelete={user.id !== currentUserId}
          />
        ))}
      </ul>
    </div>
  );
}
