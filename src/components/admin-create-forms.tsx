"use client";

import { useRef, useState, useTransition } from "react";
import {
  createTeam,
  createToolCard,
  createUser,
  updateTeam,
  updateTeamAllowance,
} from "@/app/actions/admin";
import { TeamColorPicker } from "@/components/team-color-picker";
import { ToolCardIconPicker } from "@/components/tool-card-icon-picker";
import { ToolCardKindFields } from "@/components/tool-card-kind-fields";
import { Button, Input, Select, Textarea } from "@/components/ui";

type Option = { value: string; label: string };

function useAdminForm(action: (formData: FormData) => Promise<{ error?: string }>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return { error, pending, formRef, submit };
}

export function CreateUserForm({
  teamOptions,
  canGrantHr,
}: {
  teamOptions: Option[];
  canGrantHr: boolean;
}) {
  const { error, pending, formRef, submit } = useAdminForm(createUser);

  return (
    <form ref={formRef} action={submit} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-600">
        Factory clock workers are created here (email + optional password), then
        assigned an RFID card in{" "}
        <a
          href="https://clock.meavo.app/workers"
          className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          clock.meavo.app
        </a>
        . They do not need Clock tool-card access.
      </p>
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
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}

export function CreateTeamForm() {
  const { error, pending, formRef, submit } = useAdminForm(createTeam);

  return (
    <form ref={formRef} action={submit} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
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
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create team"}
      </Button>
    </form>
  );
}

export function UpdateTeamForm({
  teamId,
  teamName,
  teamColor,
}: {
  teamId: string;
  teamName: string;
  teamColor: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await updateTeam(formData);
          if (result.error) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="teamId" value={teamId} />
      <Input label="Team name" name="name" defaultValue={teamName} required />
      <TeamColorPicker defaultColor={teamColor} />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function UpdateTeamAllowanceForm({
  teamId,
  yearlyAllowance,
}: {
  teamId: string;
  yearlyAllowance: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col items-end gap-1"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await updateTeamAllowance(
            teamId,
            Number(formData.get("yearlyAllowance")),
          );
          if (result.error) setError(result.error);
        });
      }}
    >
      <div className="flex items-end gap-2">
        <Input
          label="Update allowance"
          name="yearlyAllowance"
          type="number"
          defaultValue={yearlyAllowance}
          min={0}
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function CreateToolCardForm({ usedLinkedAppKeys }: { usedLinkedAppKeys: string[] }) {
  const { error, pending, formRef, submit } = useAdminForm(createToolCard);

  return (
    <form
      ref={formRef}
      action={submit}
      className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2"
    >
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
      <ToolCardKindFields usedLinkedAppKeys={usedLinkedAppKeys} />
      <ToolCardIconPicker />
      {error && (
        <p className="text-sm text-red-600 sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create card"}
        </Button>
      </div>
    </form>
  );
}
