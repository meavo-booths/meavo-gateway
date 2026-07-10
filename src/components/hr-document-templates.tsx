"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateTemplateForm } from "@/components/document-template-create-form";
import { EditTemplateModal } from "@/components/document-template-edit-modal";
import { GenerateDocumentModal } from "@/components/document-template-generate-modal";
import {
  type DocumentTemplateListItem,
  type TemplateUserOption,
  type TemplateVersionRef,
} from "@/components/document-template-shared";
import { VersionHistoryModal } from "@/components/document-template-version-history-modal";
import { Button, Card } from "@/components/ui";

export type { DocumentTemplateListItem };

function TemplateCard({
  template,
  users,
  onChanged,
}: {
  template: DocumentTemplateListItem;
  users: TemplateUserOption[];
  onChanged: () => void;
}) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateVersion, setGenerateVersion] = useState<TemplateVersionRef | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const activeVersion = generateVersion ?? {
    id: template.currentVersion.id,
    versionNumber: template.currentVersion.versionNumber,
  };

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
            {template.versionCount > 1 && (
              <Button type="button" variant="ghost" onClick={() => setHistoryOpen(true)}>
                Version history
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              type="button"
              onClick={() => {
                setGenerateVersion(null);
                setGenerateOpen(true);
              }}
            >
              Generate document
            </Button>
          </div>
        </div>
      </Card>

      {historyOpen && (
        <VersionHistoryModal
          template={template}
          onClose={() => setHistoryOpen(false)}
          onGenerate={(version) => {
            setGenerateVersion(version);
            setGenerateOpen(true);
          }}
        />
      )}

      {generateOpen && (
        <GenerateDocumentModal
          templateName={template.name}
          templateVersion={activeVersion}
          users={users}
          onClose={() => {
            setGenerateOpen(false);
            setGenerateVersion(null);
          }}
        />
      )}
      {editOpen && (
        <EditTemplateModal
          template={template}
          onClose={() => setEditOpen(false)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}

export function HrDocumentTemplates({
  templates,
  users,
}: {
  templates: DocumentTemplateListItem[];
  users: TemplateUserOption[];
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
          Generate PDF documents from any version of each template.
        </p>
        {templates.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-slate-500">No templates yet.</p>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                users={users}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
