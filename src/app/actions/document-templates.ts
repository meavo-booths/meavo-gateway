"use server";

import { revalidatePath } from "next/cache";
import { Company } from "@prisma/client";
import { put } from "@vercel/blob";
import { requireHr } from "@/lib/hr-auth";
import { prisma } from "@/lib/prisma";
import {
  applyOverrides,
  buildTemplateContextValues,
  emptyWarningsForPlaceholders,
} from "@/lib/template-context";
import {
  extractCustomPlaceholders,
  extractPlaceholders,
  mergeTemplate,
  type MergeWarning,
} from "@/lib/template-placeholders";
import { renderTemplatePdf } from "@/lib/template-pdf";

function revalidateDocumentationPages() {
  revalidatePath("/hr/documentation");
  revalidatePath("/hr/database");
  revalidatePath("/hr/employees");
}

function parseCompany(value: string | null): Company | null {
  return value === "MEAVO" || value === "OA" ? value : null;
}

function parseOverridesJson(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export async function createDocumentTemplate(
  formData: FormData
): Promise<{ error?: string }> {
  const hrUser = await requireHr();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim();

  if (!name || !body) {
    return { error: "Template name and body are required." };
  }

  const customPlaceholders = extractCustomPlaceholders(body);

  await prisma.$transaction(async (tx) => {
    const template = await tx.documentTemplate.create({
      data: {
        name,
        description,
        createdById: hrUser.id,
      },
    });

    await tx.documentTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        body,
        customPlaceholders: JSON.stringify(customPlaceholders),
        isCurrent: true,
        createdById: hrUser.id,
      },
    });
  });

  revalidateDocumentationPages();
  return {};
}

export async function createDocumentTemplateVersion(
  formData: FormData
): Promise<{ error?: string }> {
  const hrUser = await requireHr();
  const templateId = formData.get("templateId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!templateId || !body) {
    return { error: "Template body is required." };
  }

  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, isActive: true },
  });
  if (!template || !template.isActive) {
    return { error: "Template not found." };
  }

  const latest = await prisma.documentTemplateVersion.findFirst({
    where: { templateId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const customPlaceholders = extractCustomPlaceholders(body);

  await prisma.$transaction(async (tx) => {
    await tx.documentTemplateVersion.updateMany({
      where: { templateId, isCurrent: true },
      data: { isCurrent: false },
    });

    await tx.documentTemplateVersion.create({
      data: {
        templateId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        body,
        customPlaceholders: JSON.stringify(customPlaceholders),
        isCurrent: true,
        createdById: hrUser.id,
      },
    });

    await tx.documentTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    });
  });

  revalidateDocumentationPages();
  return {};
}

export async function getTemplateGenerationDraft({
  templateVersionId,
  subjectUserId,
  company,
  overridesJson,
}: {
  templateVersionId: string;
  subjectUserId: string | null;
  company: Company | null;
  overridesJson?: string;
}): Promise<{
  error?: string;
  placeholders?: string[];
  values?: Record<string, string>;
  warnings?: MergeWarning[];
  preview?: string;
}> {
  await requireHr();

  const version = await prisma.documentTemplateVersion.findUnique({
    where: { id: templateVersionId },
    include: { template: { select: { name: true, isActive: true } } },
  });

  if (!version || !version.template.isActive) {
    return { error: "Template version not found." };
  }

  const placeholders = extractPlaceholders(version.body);
  const { values: autopopulated, warnings: contextWarnings } = await buildTemplateContextValues({
    subjectUserId,
    company,
  });

  const overrides = parseOverridesJson(overridesJson ?? null);
  const values = applyOverrides(autopopulated, overrides);

  for (const path of placeholders.filter((p) => p.startsWith("custom."))) {
    if (!(path in values)) values[path] = overrides[path] ?? "";
  }

  const emptyWarnings = emptyWarningsForPlaceholders(placeholders, values);
  const { text, warnings: mergeWarnings } = mergeTemplate(version.body, values);

  const warnings = [...contextWarnings, ...emptyWarnings, ...mergeWarnings];
  const dedupedWarnings = warnings.filter(
    (warning, index, all) =>
      all.findIndex((item) => item.placeholder === warning.placeholder) === index
  );

  return {
    placeholders,
    values,
    warnings: dedupedWarnings,
    preview: text,
  };
}

export async function generateDocumentPdf(formData: FormData): Promise<{
  error?: string;
  documentId?: string;
  fileName?: string;
  warnings?: MergeWarning[];
  attachedToEmployee?: boolean;
}> {
  const hrUser = await requireHr();

  const templateVersionId = formData.get("templateVersionId") as string;
  const subjectUserId = (formData.get("subjectUserId") as string) || null;
  const company = parseCompany(formData.get("company") as string);
  const overridesJson = formData.get("overridesJson") as string;
  const attachToEmployee = formData.get("attachToEmployee") === "on";

  if (!templateVersionId) {
    return { error: "Template version is required." };
  }

  const draft = await getTemplateGenerationDraft({
    templateVersionId,
    subjectUserId,
    company,
    overridesJson,
  });

  if (draft.error || !draft.preview || !draft.values) {
    return { error: draft.error ?? "Failed to prepare document." };
  }

  const version = await prisma.documentTemplateVersion.findUnique({
    where: { id: templateVersionId },
    include: { template: { select: { name: true } } },
  });

  if (!version) {
    return { error: "Template version not found." };
  }

  const pdfBytes = await renderTemplatePdf({
    title: version.template.name,
    body: draft.preview,
  });

  const subjectUser = subjectUserId
    ? await prisma.user.findUnique({
        where: { id: subjectUserId },
        select: { name: true, email: true },
      })
    : null;
  const subjectLabel = subjectUser?.name ?? subjectUser?.email ?? "document";

  const safeSubject = subjectLabel.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");
  const fileName = `${version.template.name}-${safeSubject}-${Date.now()}.pdf`;

  const blob = await put(`hr/generated/${Date.now()}-${fileName}`, Buffer.from(pdfBytes), {
    access: "private",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });

  const generated = await prisma.generatedDocument.create({
    data: {
      templateVersionId,
      generatedById: hrUser.id,
      subjectUserId,
      company,
      filledValues: JSON.stringify(draft.values),
      warnings: JSON.stringify(draft.warnings ?? []),
      fileName,
      storageKey: blob.pathname,
    },
  });

  let attachedToEmployee = false;
  if (attachToEmployee && subjectUserId) {
    const employee = await prisma.employee.findUnique({
      where: { userId: subjectUserId },
      select: { id: true },
    });
    if (employee) {
      const employeeBlob = await put(
        `hr/${employee.id}/${Date.now()}-${fileName}`,
        Buffer.from(pdfBytes),
        {
          access: "private",
          addRandomSuffix: true,
          contentType: "application/pdf",
        }
      );
      await prisma.employeeDocument.create({
        data: {
          employeeId: employee.id,
          fileName,
          mimeType: "application/pdf",
          storageKey: employeeBlob.pathname,
          uploadedBy: hrUser.id,
        },
      });
      attachedToEmployee = true;
    }
  }

  revalidateDocumentationPages();
  return {
    documentId: generated.id,
    fileName,
    warnings: draft.warnings,
    attachedToEmployee,
  };
}
