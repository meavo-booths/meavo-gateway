"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createDocumentTemplate,
  createDocumentTemplateVersion,
  generateDocumentPdf,
  getTemplateGenerationDraft,
} from "@/app/actions/document-templates";
import { TEMPLATE_PLACEHOLDER_OPTIONS } from "@/lib/template-placeholders";
import { Button, Card, Input } from "@/components/ui";

export type DocumentTemplateListItem = {
  id: string;
  name: string;
  description: string;
  versionCount: number;
  currentVersion: {
    id: string;
    versionNumber: number;
    body: string;
    createdAt: string;
  };
};

type UserOption = { id: string; label: string };

const fieldClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function insertIntoTextarea(textarea: HTMLTextAreaElement, snippet: string) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const next = `${textarea.value.slice(0, start)}${snippet}${textarea.value.slice(end)}`;
  textarea.value = next;
  const cursor = start + snippet.length;
  textarea.setSelectionRange(cursor, cursor);
  textarea.focus();
  return next;
}

function CreateTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

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
          setError(null);
          startTransition(async () => {
            const result = await createDocumentTemplate(new FormData(e.currentTarget));
            if (result.error) {
              setError(result.error);
            } else {
              setBody("");
              setOpen(false);
              onCreated();
            }
          });
        }}
      >
        <Input label="Template name" name="name" required />
        <Input label="Description (optional)" name="description" />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Insert field</span>
          <select
            className={fieldClassName}
            defaultValue=""
            onChange={(e) => {
              const path = e.target.value;
              if (!path || !bodyRef.current) return;
              setBody(insertIntoTextarea(bodyRef.current, `{{${path}}}`));
              e.target.value = "";
            }}
          >
            <option value="">Choose a field…</option>
            {TEMPLATE_PLACEHOLDER_OPTIONS.map((option) => (
              <option key={option.path} value={option.path}>
                {option.label} ({`{{${option.path}}}`})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Template body</span>
          <textarea
            ref={bodyRef}
            name="body"
            required
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${fieldClassName} font-mono`}
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

function GenerateDocumentModal({
  template,
  users,
  onClose,
}: {
  template: DocumentTemplateListItem;
  users: UserOption[];
  onClose: () => void;
}) {
  const [subjectUserId, setSubjectUserId] = useState("");
  const [company, setCompany] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<{ placeholder: string; message: string }[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [draftPending, startDraftTransition] = useTransition();
  const [generatePending, startGenerateTransition] = useTransition();

  function refreshDraft(nextOverrides = overrides) {
    startDraftTransition(async () => {
      setError(null);
      const result = await getTemplateGenerationDraft({
        templateVersionId: template.currentVersion.id,
        subjectUserId: subjectUserId || null,
        company: company === "MEAVO" || company === "OA" ? company : null,
        overridesJson: JSON.stringify(nextOverrides),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setPlaceholders(result.placeholders ?? []);
      setValues(result.values ?? {});
      setWarnings(result.warnings ?? []);
      setPreview(result.preview ?? "");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">Generate document</h3>
        <p className="mt-1 text-sm text-slate-500">
          {template.name} · version {template.currentVersion.versionNumber}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Employee</span>
            <select
              className={fieldClassName}
              value={subjectUserId}
              onChange={(e) => setSubjectUserId(e.target.value)}
            >
              <option value="">Select employee…</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Company</span>
            <select
              className={fieldClassName}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              <option value="">Select company…</option>
              <option value="MEAVO">MEAVO</option>
              <option value="OA">OA</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <Button type="button" variant="secondary" disabled={draftPending} onClick={() => refreshDraft()}>
            {draftPending ? "Loading…" : "Autopopulate & preview"}
          </Button>
        </div>

        {placeholders.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Placeholders</h4>
            {placeholders.map((path) => (
              <div key={path} className="rounded-lg border border-slate-200 p-3">
                <p className="font-mono text-xs text-brand-700">{`{{${path}}}`}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Autopopulated: {values[path]?.trim() ? values[path] : "—"}
                </p>
                <label className="mt-2 block space-y-1 text-sm">
                  <span className="font-medium text-slate-700">
                    {path.startsWith("custom.") ? "Value (custom)" : "Override (optional)"}
                  </span>
                  <input
                    className={fieldClassName}
                    defaultValue={overrides[path] ?? ""}
                    onBlur={(e) => {
                      const next = { ...overrides, [path]: e.target.value };
                      setOverrides(next);
                      refreshDraft(next);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Warnings</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {warnings.map((warning) => (
                <li key={`${warning.placeholder}-${warning.message}`}>{warning.message}</li>
              ))}
            </ul>
          </div>
        )}

        {preview && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-900">Preview</h4>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {preview}
            </pre>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {downloadUrl && (
          <p className="mt-4 text-sm text-emerald-700">
            PDF ready.{" "}
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
              Open PDF
            </a>
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            disabled={generatePending || !preview}
            onClick={() => {
              setError(null);
              const formData = new FormData();
              formData.set("templateVersionId", template.currentVersion.id);
              if (subjectUserId) formData.set("subjectUserId", subjectUserId);
              if (company) formData.set("company", company);
              formData.set("overridesJson", JSON.stringify(overrides));
              startGenerateTransition(async () => {
                const result = await generateDocumentPdf(formData);
                if (result.error) {
                  setError(result.error);
                } else if (result.documentId) {
                  setDownloadUrl(`/api/hr/generated-documents/${result.documentId}`);
                  if (result.warnings) setWarnings(result.warnings);
                }
              });
            }}
          >
            {generatePending ? "Generating…" : "Generate PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditTemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: DocumentTemplateListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState(template.currentVersion.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">Edit template</h3>
        <p className="mt-1 text-sm text-slate-500">
          Saving creates version {template.currentVersion.versionNumber + 1}. Previous versions are kept.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData();
            formData.set("templateId", template.id);
            formData.set("body", body);
            startTransition(async () => {
              const result = await createDocumentTemplateVersion(formData);
              if (result.error) {
                setError(result.error);
              } else {
                onSaved();
                onClose();
              }
            });
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Insert field</span>
            <select
              className={fieldClassName}
              defaultValue=""
              onChange={(e) => {
                const path = e.target.value;
                if (!path || !bodyRef.current) return;
                setBody(insertIntoTextarea(bodyRef.current, `{{${path}}}`));
                e.target.value = "";
              }}
            >
              <option value="">Choose a field…</option>
              {TEMPLATE_PLACEHOLDER_OPTIONS.map((option) => (
                <option key={option.path} value={option.path}>
                  {option.label} ({`{{${option.path}}}`})
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Template body</span>
            <textarea
              ref={bodyRef}
              required
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${fieldClassName} font-mono`}
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
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  users,
  onChanged,
}: {
  template: DocumentTemplateListItem;
  users: UserOption[];
  onChanged: () => void;
}) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Card className="!p-4 sm:!p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
            {template.description && (
              <p className="mt-1 text-sm text-slate-500">{template.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Version {template.currentVersion.versionNumber} · {template.versionCount} version
              {template.versionCount === 1 ? "" : "s"} total
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button type="button" onClick={() => setGenerateOpen(true)}>
              Generate document
            </Button>
          </div>
        </div>
      </Card>

      {generateOpen && (
        <GenerateDocumentModal template={template} users={users} onClose={() => setGenerateOpen(false)} />
      )}
      {editOpen && (
        <EditTemplateModal template={template} onClose={() => setEditOpen(false)} onSaved={onChanged} />
      )}
    </>
  );
}

export function HrDocumentTemplates({
  templates,
  users,
}: {
  templates: DocumentTemplateListItem[];
  users: UserOption[];
}) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <CreateTemplateForm onCreated={refresh} />

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Available templates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Generate PDF documents from the current version of each template.
        </p>
        {templates.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-slate-500">No templates yet.</p>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} users={users} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
