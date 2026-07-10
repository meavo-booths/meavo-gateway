"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAnnouncement, publishAnnouncement } from "@/app/actions/app-news";
import { Modal } from "@/components/modal";
import { TemplateMarkupPreview } from "@/components/template-markup-preview";
import { Button, Input } from "@/components/ui";

export function AppNewsComposeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(publishAnnouncement, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setBody("");
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New announcement
      </Button>

      <Modal
        title="Publish announcement"
        open={open}
        onClose={() => setOpen(false)}
        maxWidthClassName="max-w-2xl"
      >
        <p className="text-sm text-slate-500">
          Publishing notifies everyone (subject to the App news toggles on the admin
          Notifications page and each person&apos;s own preferences).
        </p>

        <form action={action} className="mt-4 space-y-4">
          <Input label="Title" name="title" required placeholder="New: …" />

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Body</span>
            <textarea
              name="body"
              required
              rows={10}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={"Plain text with simple formatting:\n## Heading\n- Bullet point\n**bold**"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {body.trim() ? (
            <div>
              <span className="text-sm font-medium text-slate-700">Preview</span>
              <TemplateMarkupPreview text={body} />
            </div>
          ) : null}

          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AppNewsDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete announcement "${title}"?`)) return;
        startTransition(async () => {
          await deleteAnnouncement(id);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
