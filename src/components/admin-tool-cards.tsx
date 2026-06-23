"use client";

import { useState } from "react";
import {
  deleteToolCard,
  setCardAccess,
  updateToolCard,
} from "@/app/actions/admin";
import { ToolCardIcon } from "@/components/tool-card-icon";
import { ToolCardIconPicker } from "@/components/tool-card-icon-picker";
import { Button, Input, Textarea } from "@/components/ui";

type ToolCardData = {
  id: string;
  name: string;
  description: string;
  url: string;
  iconKey: string | null;
  accessUserIds: string[];
};

type UserOption = {
  id: string;
  label: string;
};

function Modal({
  title,
  open,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl border border-slate-200 bg-white p-6 shadow-lg ${
          wide ? "max-w-xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ToolCardRow({
  card,
  users,
}: {
  card: ToolCardData;
  users: UserOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <>
      <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {card.iconKey && <ToolCardIcon iconKey={card.iconKey} size={32} className="mt-0.5" />}
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{card.name}</p>
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{card.url}</p>
            <p className="mt-1 text-xs text-slate-500">
              {card.accessUserIds.length} user{card.accessUserIds.length !== 1 ? "s" : ""} with access
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
              if (window.confirm(`Delete "${card.name}"?`)) {
                void deleteToolCard(card.id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </li>

      <Modal title={`Edit — ${card.name}`} open={editOpen} onClose={() => setEditOpen(false)} wide>
        <form action={updateToolCard} className="space-y-4" onSubmit={() => setEditOpen(false)}>
          <input type="hidden" name="cardId" value={card.id} />
          <Input label="Name" name="name" defaultValue={card.name} required />
          <Textarea label="Description" name="description" defaultValue={card.description} required />
          <Input label="Link URL" name="url" type="url" defaultValue={card.url} required />
          <ToolCardIconPicker defaultValue={card.iconKey} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal title={`Access — ${card.name}`} open={accessOpen} onClose={() => setAccessOpen(false)}>
        <form action={setCardAccess} className="space-y-4" onSubmit={() => setAccessOpen(false)}>
          <input type="hidden" name="cardId" value={card.id} />
          <p className="text-sm text-slate-600">Select users who can see this tool on the dashboard.</p>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAccessOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save access</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdminToolCards({
  cards,
  users,
}: {
  cards: ToolCardData[];
  users: UserOption[];
}) {
  if (cards.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No tool cards yet.</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <ul className="divide-y divide-slate-100 bg-white">
        {cards.map((card) => (
          <ToolCardRow key={card.id} card={card} users={users} />
        ))}
      </ul>
    </div>
  );
}
