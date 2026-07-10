"use client";

import {
  type DocumentTemplateListItem,
  type TemplateVersionRef,
} from "@/components/document-template-shared";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";

export function VersionHistoryModal({
  template,
  onClose,
  onGenerate,
}: {
  template: DocumentTemplateListItem;
  onClose: () => void;
  onGenerate: (version: TemplateVersionRef) => void;
}) {
  return (
    <Modal
      title="Version history"
      open
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      panelClassName="max-h-[90vh] overflow-y-auto p-6"
      bodyClassName=""
    >
      <p className="mt-1 text-sm text-slate-500">{template.name}</p>

      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {template.versions.map((version) => (
          <li
            key={version.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                Version {version.versionNumber}
                {version.isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    Current
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {new Date(version.createdAt).toLocaleString()}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onGenerate({ id: version.id, versionNumber: version.versionNumber });
                onClose();
              }}
            >
              Generate
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
