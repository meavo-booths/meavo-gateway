"use client";

import { changeUserTeam, resetUserPassword, setUserAccess } from "@/app/actions/admin";
import { FormModal } from "@/components/form-modal";
import { Input, Select } from "@/components/ui";

export type TeamOption = { value: string; label: string };
export type CardOption = { id: string; label: string };

export type AdminUser = {
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

export function ManageAccessModal({
  user,
  displayName,
  cardOptions,
  canGrantHr,
  open,
  onClose,
}: {
  user: AdminUser;
  displayName: string;
  cardOptions: CardOption[];
  canGrantHr: boolean;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <FormModal
      title={`Access — ${displayName}`}
      open={open}
      onClose={onClose}
      action={setUserAccess}
      submitLabel="Save access"
      maxWidthClassName="max-w-md"
    >
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
        {canGrantHr && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="grantHr"
              defaultChecked={user.hrAccess}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
            />
            <span>HR access</span>
          </label>
        )}
      </div>
      <p className="text-sm text-slate-600">
        Select tools this user can see on the dashboard. Cards marked App access also control
        sign-in to that Meavo tool.
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
    </FormModal>
  );
}

export function ChangeTeamModal({
  user,
  displayName,
  teamOptions,
  open,
  onClose,
}: {
  user: AdminUser;
  displayName: string;
  teamOptions: TeamOption[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <FormModal
      title={`Change team — ${displayName}`}
      open={open}
      onClose={onClose}
      action={changeUserTeam}
      submitLabel="Save"
    >
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
    </FormModal>
  );
}

export function ResetPasswordModal({
  userId,
  displayName,
  open,
  onClose,
}: {
  userId: string;
  displayName: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <FormModal
      title={`Reset password — ${displayName}`}
      open={open}
      onClose={onClose}
      action={resetUserPassword}
      submitLabel="Reset password"
    >
      <input type="hidden" name="userId" value={userId} />
      <Input
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
    </FormModal>
  );
}
