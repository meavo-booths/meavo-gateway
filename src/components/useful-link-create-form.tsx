"use client";

import { useRef, useState, useTransition } from "react";
import { createUsefulLink } from "@/app/actions/useful-links";
import { ToolCardIconPicker } from "@/components/tool-card-icon-picker";
import { Button, Input, Textarea } from "@/components/ui";

export function UsefulLinkCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createUsefulLink(formData);
          if (result?.error) {
            setError(result.error);
          } else {
            formRef.current?.reset();
          }
        });
      }}
    >
      <Input label="Name" name="name" required placeholder="e.g. Brand guidelines" />
      <Input label="Link URL" name="url" type="url" required placeholder="https://..." />
      <div className="sm:col-span-2">
        <Textarea
          label="Description"
          name="description"
          required
          placeholder="What this link is for"
        />
      </div>
      <div className="sm:col-span-2">
        <ToolCardIconPicker />
      </div>
      {error && (
        <p className="text-sm text-red-600 sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add link"}
        </Button>
      </div>
    </form>
  );
}
