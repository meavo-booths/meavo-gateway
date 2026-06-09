"use server";

import { revalidatePath } from "next/cache";
import { SystemRole, TeamRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAdmin } from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
  return session.user;
}

export async function createUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim() || null;
  const password = formData.get("password") as string;
  const makeAdmin = formData.get("makeAdmin") === "on";
  const teamId = formData.get("teamId") as string;
  const role =
    (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!email || !teamId) return;
  if (!password || password.length < 8) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
      },
    });

    await tx.teamMember.create({
      data: { userId: user.id, teamId, role },
    });
  });

  revalidatePath("/admin");
}

export async function deleteUser(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (!userId || userId === session.id) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  if (!user) return;

  if (user.systemRole === SystemRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { systemRole: SystemRole.ADMIN },
    });
    if (adminCount <= 1) return;
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function resetUserPassword(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  if (!userId) return;
  if (!password || password.length < 8) return;

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidatePath("/admin");
}

export async function changeUserTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const teamId = formData.get("teamId") as string;
  const role =
    (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!userId || !teamId) return;

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany({ where: { userId } });
    await tx.teamMember.create({ data: { userId, teamId, role } });
  });

  revalidatePath("/admin");
}

export async function createTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  await prisma.team.create({ data: { name } });
  revalidatePath("/admin");
}

export async function createToolCard(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();

  if (!name || !description || !url) return;

  await prisma.toolCard.create({
    data: { name, description, url },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateToolCard(formData: FormData): Promise<void> {
  await requireAdmin();
  const cardId = formData.get("cardId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();

  if (!cardId || !name || !description || !url) return;

  await prisma.toolCard.update({
    where: { id: cardId },
    data: { name, description, url },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteToolCard(cardId: string): Promise<void> {
  await requireAdmin();
  if (!cardId) return;

  await prisma.toolCard.delete({ where: { id: cardId } });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setCardAccess(formData: FormData): Promise<void> {
  await requireAdmin();
  const cardId = formData.get("cardId") as string;
  if (!cardId) return;

  const userIds = formData.getAll("userId").map((id) => String(id));

  await prisma.$transaction(async (tx) => {
    await tx.toolCardAccess.deleteMany({ where: { cardId } });
    if (userIds.length > 0) {
      await tx.toolCardAccess.createMany({
        data: userIds.map((userId) => ({ userId, cardId })),
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setUserAccess(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  if (!userId) return;

  const cardIds = formData.getAll("cardId").map((id) => String(id));

  await prisma.$transaction(async (tx) => {
    await tx.toolCardAccess.deleteMany({ where: { userId } });
    if (cardIds.length > 0) {
      await tx.toolCardAccess.createMany({
        data: cardIds.map((cardId) => ({ userId, cardId })),
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
}
