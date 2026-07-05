"use client";

import { useState, useTransition } from "react";
import { ToolCardKind } from "@prisma/client";
import {
  deleteToolCard,
  setCardAccess,
  updateToolCard,
} from "@/app/actions/admin";
import { ToolCardIcon } from "@/components/tool-card-icon";
import { ToolCardIconPicker } from "@/components/tool-card-icon-picker";
import { ToolCardKindBadge } from "@/components/tool-card-kind-badge";
import { ToolCardKindFields } from "@/components/tool-card-kind-fields";
import { toolCardAccessDescription, toolCardDeleteWarning } from "@/lib/tool-card-kind";
import { Modal } from "@/components/modal";
import { Button, Input, Textarea } from "@/components/ui";

type ToolCardData = {
  id: string;
  name: string;
  description: string;
  url: string;
  iconKey: string | null;
  kind: ToolCardKind;
  linkedAppKey: string | null;
  accessUserIds: string[];
};

type UserOption = {
  id: string;
  label: string;
};

function ToolCardRow({
  card,
  users,
  usedLinkedAppKeys,
}: {
  card: ToolCardData;
  users: UserOption[];
  usedLinkedAppKeys: string[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editUsedKeys = usedLinkedAppKeys.filter((key) => key !== card.linkedAppKey);

  return (
    <>
      <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {card.iconKey && <ToolCardIcon iconKey={card.iconKey} size={32} className="mt-0.5" />}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-900">{card.name}</p>
              <ToolCardKindBadge kind={card.kind} linkedAppKey={card.linkedAppKey} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{card.url}</p>
            <p className="mt-1 text-xs text-slate-500">
              {card.accessUserIds.length} user{card.accessUserIds.length !== 1 ? "s" : ""} with
              access
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setAccessOpen(true)}>
            Manage access
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              const message = toolCardDeleteWarning(
                card.name,
                card.kind,
                card.linkedAppKey,
                card.accessUserIds.length,
              );
              if (window.confirm(message)) {
                setDeleteError(null);
                startTransition(async () => {
                  const result = await deleteToolCard(card.id);
                  if (result.error) setDeleteError(result.error);
                });
              }
            }}
          >
            Delete
          </Button>
        </div>
        {deleteError && (
          <p className="text-sm text-red-600" role="alert">
            {deleteError}
          </p>
        )}
      </li>

      <Modal
        title={`Edit — ${card.name}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidthClassName="max-w-xl"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setEditError(null);
            startTransition(async () => {
              const result = await updateToolCard(formData);
              if (result.error) {
                setEditError(result.error);
              } else {
                setEditOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="cardId" value={card.id} />
          <Input label="Name" name="name" defaultValue={card.name} required />
          <Textarea label="Description" name="description" defaultValue={card.description} required />
          <Input label="Link URL" name="url" type="url" defaultValue={card.url} required />
          <ToolCardKindFields
            defaultKind={card.kind}
            defaultLinkedAppKey={card.linkedAppKey}
            usedLinkedAppKeys={editUsedKeys}
          />
          <ToolCardIconPicker defaultValue={card.iconKey} />
          {editError && (
            <p className="text-sm text-red-600" role="alert">
              {editError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title={`Access — ${card.name}`} open={accessOpen} onClose={() => setAccessOpen(false)}>
        <form
          className="space-y-4"
          action={(formData) => {
            setAccessError(null);
            startTransition(async () => {
              const result = await setCardAccess(formData);
              if (result.error) {
                setAccessError(result.error);
              } else {
                setAccessOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="cardId" value={card.id} />
          <p className="text-sm text-slate-600">
            {toolCardAccessDescription(card.kind, card.linkedAppKey)}
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="userId"
                  value={user.id}
                  defaultChecked={card.accessUserIds.includes(user.id)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                />
                <span>{user.label}</span>
              </label>
            ))}
          </div>
          {accessError && (
            <p className="text-sm text-red-600" role="alert">
              {accessError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAccessOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save access"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdminToolCards({
  cards,
  users,
  usedLinkedAppKeys,
}: {
  cards: ToolCardData[];
  users: UserOption[];
  usedLinkedAppKeys: string[];
}) {
  if (cards.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No tool cards yet.</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <ul className="divide-y divide-slate-100 bg-white">
        {cards.map((card) => (
          <ToolCardRow
            key={card.id}
            card={card}
            users={users}
            usedLinkedAppKeys={usedLinkedAppKeys}
          />
        ))}
      </ul>
    </div>
  );
}
