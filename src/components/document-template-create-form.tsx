"use client";

import { useRef, useState } from "react";
import { createDocumentTemplate } from "@/app/actions/document-templates";
import { InsertFieldSelect } from "@/components/document-template-shared";
import {
  TemplateBodyEditor,
  type TemplateBodyEditorHandle,
} from "@/components/template-body-editor";
import { Button, Card, Input } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";

export function CreateTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const bodyEditorRef = useRef<TemplateBodyEditorHandle>(null);

  const { submit, error, pending } = useFormAction(createDocumentTemplate, {
    onSuccess: () => {
      setBody("");
      setOpen(false);
      onCreated();
    },
  });

  if (!open) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create a template</h2>
            <p className="mt-1 text-sm text-slate-500">
              Paste contract text and insert placeholders from the database field list.
            </p>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>
            New template
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Create a template</h2>
      <p className="mt-1 text-sm text-slate-500">
        Use {"{{company.legalName}}"}, {"{{employee.role}}"}, {"{{user.email}}"}, or ad-hoc{" "}
        {"{{custom.salary}}"} placeholders.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
        }}
      >
        <Input label="Template name" name="name" required />
        <Input label="Description (optional)" name="description" />
        <InsertFieldSelect
          onInsert={(snippet) => bodyEditorRef.current?.insertSnippet(snippet)}
        />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Template body</span>
          <TemplateBodyEditor
            ref={bodyEditorRef}
            value={body}
            onChange={setBody}
            required
            rows={12}
            placeholder="Agreement between {{company.legalName}} and {{user.name}}…"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save template"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
