"use client";

import { useState, useTransition } from "react";
import { changePassword, updateProfileName } from "@/app/actions/profile";
import { Button, Card, Input } from "@/components/ui";
import { UserAvatar } from "@meavo/navigation";

type ProfileTeam = {
  name: string;
  color: string;
  role: "MANAGER" | "MEMBER";
};

export function ProfileForm({
  email,
  name,
  image,
  teams,
}: {
  email: string;
  name: string | null;
  image: string | null;
  teams: ProfileTeam[];
}) {
  const [nameSuccess, setNameSuccess] = useState(false);
  const [namePending, startNameTransition] = useTransition();
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordPending, startPasswordTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="flex items-center gap-4">
          <UserAvatar name={name} email={email} image={image} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update how your name appears across Meavo tools.
            </p>
          </div>
        </div>
        <form
          className="mt-4 space-y-4"
          action={(formData) => {
            setNameSuccess(false);
            startNameTransition(async () => {
              await updateProfileName(formData);
              setNameSuccess(true);
            });
          }}
        >
          <div className="text-sm">
            <p className="font-medium text-slate-700">Email</p>
            <p className="mt-1 text-slate-600">{email}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-700">Team</p>
            {teams.length === 0 ? (
              <p className="mt-1 text-slate-500">Not assigned to a team</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {teams.map((team) => (
                  <li key={team.name} className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-slate-200"
                      style={{ backgroundColor: team.color }}
                      aria-hidden
                    />
                    <span>
                      {team.name}
                      {team.role === "MANAGER" && (
                        <span className="text-slate-400"> · Manager</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input
            label="Display name"
            name="name"
            defaultValue={name ?? ""}
            placeholder="Jane Smith"
            autoComplete="name"
          />
          {nameSuccess && <p className="text-sm text-emerald-600">Name updated.</p>}
          <Button type="submit" disabled={namePending}>
            {namePending ? "Saving…" : "Save name"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a new password of at least 8 characters.
        </p>
        <form
          className="mt-4 space-y-4"
          action={(formData) => {
            setPasswordError(null);
            setPasswordSuccess(false);
            startPasswordTransition(async () => {
              const result = await changePassword(formData);
              if (result.error) {
                setPasswordError(result.error);
              } else {
                setPasswordSuccess(true);
                (document.getElementById("password-form") as HTMLFormElement)?.reset();
              }
            });
          }}
          id="password-form"
        >
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
          />
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-emerald-600">Password updated.</p>}
          <Button type="submit" disabled={passwordPending}>
            {passwordPending ? "Updating…" : "Change password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
