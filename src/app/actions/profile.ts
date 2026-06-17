"use server";

import { revalidatePath } from "next/cache";
import { ContractType } from "@prisma/client";
import { auth } from "@/lib/auth";
import {
  parseEmployeePersonalFields,
  parseEmployeeProviderFields,
  parseOptionalEmployeeDate,
  trimEmployeeField,
} from "@/lib/employee-details";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function requireOwnEmployee() {
  const user = await requireUser();
  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true, contract: true },
  });
  if (!employee) return null;
  return { user, employee };
}

export async function updateProfileName(formData: FormData) {
  const user = await requireUser();
  const name = (formData.get("name") as string)?.trim() || null;

  await prisma.user.update({
    where: { id: user.id },
    data: { name },
  });

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "Current and new password are required." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser?.passwordHash) {
    return { error: "Your account cannot change password here." };
  }

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return { success: true };
}

export async function updateMyEmployeePersonalDetails(
  formData: FormData
): Promise<{ error?: string }> {
  const own = await requireOwnEmployee();
  if (!own) return { error: "You are not registered as an employee." };

  const birthdateRaw = trimEmployeeField(formData.get("employeeBirthdate"));
  if (birthdateRaw && !parseOptionalEmployeeDate(formData.get("employeeBirthdate"))) {
    return { error: "Invalid birthdate." };
  }

  await prisma.employee.update({
    where: { id: own.employee.id },
    data: parseEmployeePersonalFields(formData),
  });

  revalidatePath("/profile");
  revalidatePath("/hr/employees");
  return {};
}

export async function updateMyEmployeeProviderDetails(
  formData: FormData
): Promise<{ error?: string }> {
  const own = await requireOwnEmployee();
  if (!own) return { error: "You are not registered as an employee." };
  if (own.employee.contract !== ContractType.FREELANCE) {
    return { error: "Company information applies to freelance employees only." };
  }

  await prisma.employee.update({
    where: { id: own.employee.id },
    data: parseEmployeeProviderFields(formData),
  });

  revalidatePath("/profile");
  revalidatePath("/hr/employees");
  return {};
}
