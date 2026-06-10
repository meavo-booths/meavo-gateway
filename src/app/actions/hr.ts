"use server";

import { revalidatePath } from "next/cache";
import { Company, ContractType } from "@prisma/client";
import { del, put } from "@vercel/blob";
import { requireHr } from "@/lib/hr-auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function parseCompany(value: string): Company | null {
  return value === "MEAVO" || value === "OA" ? value : null;
}

function parseContract(value: string): ContractType | null {
  return value === "FTE" || value === "FREELANCE" ? value : null;
}

export async function hireEmployee(formData: FormData): Promise<{ error?: string }> {
  await requireHr();

  const userId = formData.get("userId") as string;
  const company = parseCompany(formData.get("company") as string);
  const contract = parseContract(formData.get("contract") as string);
  const startDateRaw = formData.get("startDate") as string;
  const role = (formData.get("role") as string)?.trim();

  if (!userId || !company || !contract || !startDateRaw || !role) {
    return { error: "All fields are required." };
  }

  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) {
    return { error: "Invalid start date." };
  }

  const existing = await prisma.employee.findUnique({ where: { userId } });
  if (existing) {
    return { error: "This user is already an employee." };
  }

  await prisma.employee.create({
    data: {
      userId,
      company,
      contract,
      startDate,
      role,
    },
  });

  revalidatePath("/hr");
  return {};
}

export async function uploadEmployeeDocument(
  formData: FormData
): Promise<{ error?: string }> {
  const hrUser = await requireHr();

  const employeeId = formData.get("employeeId") as string;
  const file = formData.get("file");

  if (!employeeId || !(file instanceof File)) {
    return { error: "A PDF file is required." };
  }

  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are allowed." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: "File must be 10 MB or smaller." };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) {
    return { error: "Employee not found." };
  }

  const blob = await put(`hr/${employeeId}/${Date.now()}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  await prisma.employeeDocument.create({
    data: {
      employeeId,
      fileName: file.name,
      mimeType: file.type,
      storageKey: blob.url,
      uploadedBy: hrUser.id,
    },
  });

  revalidatePath("/hr");
  return {};
}

export async function deleteEmployeeDocument(documentId: string): Promise<void> {
  await requireHr();
  if (!documentId) return;

  const doc = await prisma.employeeDocument.findUnique({
    where: { id: documentId },
    select: { storageKey: true },
  });
  if (!doc) return;

  try {
    await del(doc.storageKey);
  } catch {
    // Blob may already be gone; still remove DB row.
  }

  await prisma.employeeDocument.delete({ where: { id: documentId } });
  revalidatePath("/hr");
}
