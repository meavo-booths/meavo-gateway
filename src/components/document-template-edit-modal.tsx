"use client";

import { useRef, useState } from "react";
import { createDocumentTemplateVersion } from "@/app/actions/document-templates";
import {
  InsertFieldSelect,
  type DocumentTemplateListItem,
} from "@/components/document-template-shared";
import { Modal } from "@/components/modal";
import {
  TemplateBodyEditor,
  type TemplateBodyEditorHandle,
} from "@/components/template-body-editor";
import { Button } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";

export function EditTemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: DocumentTemplateListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState(template.currentVersion.body);
  const bodyEditorRef = useRef<TemplateBodyEditorHandle>(null);

  const { submit, error, pending } = useFormAction(createDocumentTemplateVersion, {
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Modal
      title="Edit template"
      open
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      panelClassName="max-h-[90vh] overflow-y-auto p-6"
      bodyClassName=""
    >
      <p className="mt-1 text-sm text-slate-500">
        Saving creates version {template.currentVersion.versionNumber + 1}. Previous versions
        are kept.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData();
          formData.set("templateId", template.id);
          formData.set("body", body);
          submit(formData);
        }}
      >
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
            rows={14}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save new version"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
