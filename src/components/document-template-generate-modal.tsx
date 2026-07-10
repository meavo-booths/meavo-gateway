"use client";

import { useState, useTransition } from "react";
import {
  generateDocumentPdf,
  getTemplateGenerationDraft,
} from "@/app/actions/document-templates";
import {
  templateFieldClassName,
  type TemplateUserOption,
  type TemplateVersionRef,
} from "@/components/document-template-shared";
import { Modal } from "@/components/modal";
import { TemplateMarkupPreview } from "@/components/template-markup-preview";
import { Button } from "@/components/ui";

export function GenerateDocumentModal({
  templateName,
  templateVersion,
  users,
  onClose,
}: {
  templateName: string;
  templateVersion: TemplateVersionRef;
  users: TemplateUserOption[];
  onClose: () => void;
}) {
  const [subjectUserId, setSubjectUserId] = useState("");
  const [company, setCompany] = useState("");
  const [attachToEmployee, setAttachToEmployee] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<{ placeholder: string; message: string }[]>([]);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [attachedMessage, setAttachedMessage] = useState<string | null>(null);
  const [draftPending, startDraftTransition] = useTransition();
  const [generatePending, startGenerateTransition] = useTransition();

  function refreshDraft(nextOverrides = overrides) {
    startDraftTransition(async () => {
      setError(null);
      const result = await getTemplateGenerationDraft({
        templateVersionId: templateVersion.id,
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
    <Modal
      title="Generate document"
      open
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      panelClassName="max-h-[90vh] overflow-y-auto p-6"
      bodyClassName=""
    >
      <p className="mt-1 text-sm text-slate-500">
        {templateName} · version {templateVersion.versionNumber}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Employee</span>
          <select
            className={templateFieldClassName}
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
            className={templateFieldClassName}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option value="">Select company…</option>
            <option value="MEAVO">MEAVO</option>
            <option value="OA">OA</option>
          </select>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={attachToEmployee}
          onChange={(e) => setAttachToEmployee(e.target.checked)}
          disabled={!subjectUserId}
          className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
        />
        Attach PDF to employee profile (when the selected user is an employee)
      </label>

      <div className="mt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={draftPending}
          onClick={() => refreshDraft()}
        >
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
                  className={templateFieldClassName}
                  value={overrides[path] ?? ""}
                  // Controlled so "Generate PDF" always sees the latest
                  // text; the (slower) server preview refreshes on blur.
                  onChange={(e) =>
                    setOverrides((current) => ({ ...current, [path]: e.target.value }))
                  }
                  onBlur={() => refreshDraft()}
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
          <TemplateMarkupPreview text={preview} />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {downloadUrl && (
        <p className="mt-4 text-sm text-emerald-700">
          PDF ready.{" "}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Open PDF
          </a>
          {attachedMessage && <span className="block mt-1">{attachedMessage}</span>}
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
            setAttachedMessage(null);
            const formData = new FormData();
            formData.set("templateVersionId", templateVersion.id);
            if (subjectUserId) formData.set("subjectUserId", subjectUserId);
            if (company) formData.set("company", company);
            formData.set("overridesJson", JSON.stringify(overrides));
            if (attachToEmployee) formData.set("attachToEmployee", "on");
            startGenerateTransition(async () => {
              const result = await generateDocumentPdf(formData);
              if (result.error) {
                setError(result.error);
              } else if (result.documentId) {
                setDownloadUrl(`/api/hr/generated-documents/${result.documentId}`);
                if (result.warnings) setWarnings(result.warnings);
                if (result.attachedToEmployee) {
                  setAttachedMessage(
                    "Also attached to the employee profile on HR → Employees."
                  );
                } else if (attachToEmployee && subjectUserId) {
                  setAttachedMessage(
                    "Not attached — selected user is not an employee, or attachment was skipped."
                  );
                }
              }
            });
          }}
        >
          {generatePending ? "Generating…" : "Generate PDF"}
        </Button>
      </div>
    </Modal>
  );
}
