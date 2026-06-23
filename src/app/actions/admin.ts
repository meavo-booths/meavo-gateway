"use server";

import { revalidatePath } from "next/cache";
import { SystemRole, TeamRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseIconKey } from "@/lib/tool-card-icons";
import { isAdmin, canGrantHrAccess } from "@/lib/permissions";
import { DEFAULT_TEAM_COLOR, isValidTeamColor } from "@/lib/team-colors";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");
  return session.user;
}

function revalidateAdminPages() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/tools");
}

export async function createUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim() || null;
  const password = (formData.get("password") as string)?.trim();
  const makeAdmin = formData.get("makeAdmin") === "on";
  const grantHr =
    formData.get("grantHr") === "on" && (await canGrantHrAccess(admin.id));
  const teamId = formData.get("teamId") as string;
  const role =
    (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!email || !teamId) return;
  if (password && password.length < 8) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = password ? await hashPassword(password) : null;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
        hrAccess: grantHr,
      },
    });

    await tx.teamMember.create({
      data: { userId: user.id, teamId, role },
    });
  });

  revalidateAdminPages();
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
  revalidateAdminPages();
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

  revalidateAdminPages();
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

  revalidateAdminPages();
}

export async function createTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const yearlyAllowance = Number(formData.get("yearlyAllowance"));
  const colorInput = (formData.get("color") as string) ?? DEFAULT_TEAM_COLOR;
  const color = isValidTeamColor(colorInput) ? colorInput : DEFAULT_TEAM_COLOR;

  if (!name) return;
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) return;

  try {
    await prisma.team.create({ data: { name, yearlyAllowance, color } });
  } catch {
    return;
  }

  revalidateAdminPages();
}

export async function updateTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const teamId = formData.get("teamId") as string;
  const name = (formData.get("name") as string)?.trim();
  const colorInput = (formData.get("color") as string) ?? DEFAULT_TEAM_COLOR;
  const color = isValidTeamColor(colorInput) ? colorInput : DEFAULT_TEAM_COLOR;

  if (!teamId || !name) return;

  try {
    await prisma.team.update({
      where: { id: teamId },
      data: { name, color },
    });
  } catch {
    return;
  }

  revalidateAdminPages();
}

export async function updateTeamAllowance(
  teamId: string,
  yearlyAllowance: number
): Promise<void> {
  await requireAdmin();
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { yearlyAllowance },
  });

  revalidateAdminPages();
}

export async function createToolCard(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const iconKey = parseIconKey(formData);

  if (!name || !description || !url) return;

  await prisma.toolCard.create({
    data: { name, description, url, iconKey },
  });

  revalidateAdminPages();
  revalidatePath("/");
}

export async function updateToolCard(formData: FormData): Promise<void> {
  await requireAdmin();
  const cardId = formData.get("cardId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const iconKey = parseIconKey(formData);

  if (!cardId || !name || !description || !url) return;

  await prisma.toolCard.update({
    where: { id: cardId },
    data: { name, description, url, iconKey },
  });

  revalidateAdminPages();
  revalidatePath("/");
}

export async function deleteToolCard(cardId: string): Promise<void> {
  await requireAdmin();
  if (!cardId) return;

  await prisma.toolCard.delete({ where: { id: cardId } });
  revalidateAdminPages();
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

  revalidateAdminPages();
  revalidatePath("/");
}

export async function setUserAccess(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  if (!userId) return;

  const cardIds = formData.getAll("cardId").map((id) => String(id));
  const makeAdmin = formData.get("makeAdmin") === "on";
  const grantHrRequested = formData.get("grantHr") === "on";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true, hrAccess: true },
  });
  if (!user) return;

  const grantHr = (await canGrantHrAccess(admin.id))
    ? grantHrRequested
    : user.hrAccess;

  if (user.systemRole === SystemRole.ADMIN && !makeAdmin) {
    const adminCount = await prisma.user.count({
      where: { systemRole: SystemRole.ADMIN },
    });
    if (adminCount <= 1) return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
        hrAccess: grantHr,
      },
    });

    await tx.toolCardAccess.deleteMany({ where: { userId } });
    if (cardIds.length > 0) {
      await tx.toolCardAccess.createMany({
        data: cardIds.map((cardId) => ({ userId, cardId })),
      });
    }
  });

  revalidateAdminPages();
  revalidatePath("/");
  revalidatePath("/hr/employees");
  revalidatePath("/hr/documentation");
}
