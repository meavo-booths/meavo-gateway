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

function trimField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseContract(value: string): ContractType | null {
  return value === "FTE" || value === "FREELANCE" ? value : null;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateHrPages() {
  revalidatePath("/hr/employees");
  revalidatePath("/hr/documentation");
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

  revalidateHrPages();
  return {};
}

export async function updateEmployee(formData: FormData): Promise<{ error?: string }> {
  await requireHr();

  const employeeId = formData.get("employeeId") as string;
  const company = parseCompany(formData.get("company") as string);
  const contract = parseContract(formData.get("contract") as string);
  const startDateRaw = formData.get("startDate") as string;
  const role = (formData.get("role") as string)?.trim();

  if (!employeeId || !company || !contract || !startDateRaw || !role) {
    return { error: "All fields are required." };
  }

  const startDate = parseDate(startDateRaw);
  if (!startDate) {
    return { error: "Invalid start date." };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) {
    return { error: "Employee not found." };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { company, contract, startDate, role },
  });

  revalidateHrPages();
  return {};
}

export async function endEmployeeContract(formData: FormData): Promise<{ error?: string }> {
  await requireHr();

  const employeeId = formData.get("employeeId") as string;
  const endDateRaw = formData.get("endDate") as string;

  if (!employeeId || !endDateRaw) {
    return { error: "End date is required." };
  }

  const endDate = parseDate(endDateRaw);
  if (!endDate) {
    return { error: "Invalid end date." };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) {
    return { error: "Employee not found." };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { endDate },
  });

  revalidateHrPages();
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
      storageKey: blob.pathname,
      uploadedBy: hrUser.id,
    },
  });

  revalidateHrPages();
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
  revalidateHrPages();
}

export async function updateCompanyProfile(formData: FormData): Promise<void> {
  await requireHr();

  const company = parseCompany(formData.get("company") as string);
  if (!company) return;

  const data = {
    legalName: trimField(formData.get("legalName")),
    legalNameBg: trimField(formData.get("legalNameBg")),
    address: trimField(formData.get("address")),
    addressBg: trimField(formData.get("addressBg")),
    companyNumber: trimField(formData.get("companyNumber")),
    vatNumber: trimField(formData.get("vatNumber")),
    deVatNumber: trimField(formData.get("deVatNumber")),
    eori: trimField(formData.get("eori")),
    manager: trimField(formData.get("manager")),
    managerBg: trimField(formData.get("managerBg")),
  };

  await prisma.companyProfile.upsert({
    where: { company },
    update: data,
    create: { company, ...data },
  });

  revalidateHrPages();
}
