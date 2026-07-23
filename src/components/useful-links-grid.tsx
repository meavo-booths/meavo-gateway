"use client";

import { useState, useTransition } from "react";
import { deleteUsefulLink, updateUsefulLink } from "@/app/actions/useful-links";
import { Modal } from "@/components/modal";
import { ToolCardIconPicker } from "@/components/tool-card-icon-picker";
import { ToolCardTile } from "@/components/tool-card-tile";
import { Button, Input, Textarea } from "@/components/ui";

export type UsefulLinkData = {
  id: string;
  name: string;
  description: string;
  url: string;
  iconKey: string | null;
};

function EditUsefulLinkModal({
  link,
  open,
  onClose,
}: {
  link: UsefulLinkData;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Modal title={`Edit — ${link.name}`} open={open} onClose={onClose} maxWidthClassName="max-w-xl">
      <form
        className="space-y-4"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await updateUsefulLink(formData);
            if (result?.error) {
              setError(result.error);
            } else {
              onClose();
            }
          });
        }}
      >
        <input type="hidden" name="linkId" value={link.id} />
        <Input label="Name" name="name" defaultValue={link.name} required />
        <Input label="Link URL" name="url" type="url" defaultValue={link.url} required />
        <Textarea label="Description" name="description" defaultValue={link.description} required />
        <ToolCardIconPicker defaultValue={link.iconKey} />
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UsefulLinkCard({
  link,
  canManage,
}: {
  link: UsefulLinkData;
  canManage: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  return (
    <div className="flex h-full flex-col">
      <ToolCardTile
        name={link.name}
        description={link.description}
        url={link.url}
        iconKey={link.iconKey}
      />
      {canManage && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deletePending}
            onClick={() => {
              if (!window.confirm(`Delete "${link.name}"? This cannot be undone.`)) return;
              setDeleteError(null);
              startDeleteTransition(async () => {
                const result = await deleteUsefulLink(link.id);
                if (result?.error) setDeleteError(result.error);
              });
            }}
          >
            Delete
          </Button>
          {deleteError && (
            <p className="w-full text-sm text-red-600" role="alert">
              {deleteError}
            </p>
          )}
        </div>
      )}
      <EditUsefulLinkModal link={link} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

export function UsefulLinksGrid({
  links,
  canManage,
}: {
  links: UsefulLinkData[];
  canManage: boolean;
}) {
  if (links.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {canManage ? "No links yet. Add one above." : "No useful links yet."}
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <UsefulLinkCard key={link.id} link={link} canManage={canManage} />
      ))}
    </div>
  );
}
