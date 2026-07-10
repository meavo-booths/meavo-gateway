"use server";

import { revalidatePath } from "next/cache";
import { Prisma, SystemRole, TeamRole, ToolCardKind } from "@prisma/client";
import { requireAdmin } from "@/lib/action-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseIconKey } from "@/lib/tool-card-icons";
import { parseToolCardKindFields } from "@/lib/tool-card-kind";
import { canGrantHrAccess } from "@/lib/permissions";
import { DEFAULT_TEAM_COLOR, isValidTeamColor } from "@/lib/team-colors";
import { enqueueNotification } from "@/lib/notifications/enqueue";

export type ActionResult = { error?: string };

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function revalidateAdminPages() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/tools");
}

/** Tool-card links must be absolute https URLs (no javascript:/data: schemes). */
function isValidToolCardUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function createUser(formData: FormData): Promise<ActionResult> {
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

  if (!email || !teamId) return { error: "Email and team are required." };
  if (password && password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with this email already exists." };

  const passwordHash = password ? await hashPassword(password) : null;

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          systemRole: makeAdmin ? SystemRole.ADMIN : SystemRole.USER,
          hrAccess: grantHr,
        },
      });

      await tx.teamMember.create({
        data: { userId: created.id, teamId, role },
      });

      return created;
    });
  } catch (error) {
    // Concurrent create with the same email — the pre-check above raced.
    if (isUniqueConstraintError(error)) {
      return { error: "A user with this email already exists." };
    }
    throw error;
  }

  void enqueueNotification({
    sourceApp: "gateway",
    eventType: "gateway.user.created",
    idempotencyKey: `gateway:user:created:${user.id}`,
    payload: { userId: user.id },
  }).catch((error) => {
    console.error("Notification enqueue failed:", error);
  });

  revalidateAdminPages();
  return {};
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!userId || userId === session.id)
    return { error: "You cannot delete your own account." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  if (!user) return { error: "User not found." };

  if (user.systemRole === SystemRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { systemRole: SystemRole.ADMIN },
    });
    if (adminCount <= 1) return { error: "Cannot delete the last admin." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidateAdminPages();
  return {};
}

export async function resetUserPassword(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  if (!userId) return { error: "Missing user." };
  if (!password || password.length < 8)
    return { error: "Password must be at least 8 characters." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });

  revalidateAdminPages();
  return {};
}

export async function changeUserTeam(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const teamId = formData.get("teamId") as string;
  const role =
    (formData.get("role") as string) === "MANAGER" ? TeamRole.MANAGER : TeamRole.MEMBER;

  if (!userId || !teamId) return { error: "Select a team." };

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany({ where: { userId } });
    await tx.teamMember.create({ data: { userId, teamId, role } });
  });

  revalidateAdminPages();
  return {};
}

export async function createTeam(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const yearlyAllowance = Number(formData.get("yearlyAllowance"));
  const colorInput = (formData.get("color") as string) ?? DEFAULT_TEAM_COLOR;
  const color = isValidTeamColor(colorInput) ? colorInput : DEFAULT_TEAM_COLOR;

  if (!name) return { error: "Team name is required." };
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0)
    return { error: "Yearly allowance must be a non-negative number." };

  try {
    await prisma.team.create({ data: { name, yearlyAllowance, color } });
  } catch {
    return { error: "Could not create team — the name may already be in use." };
  }

  revalidateAdminPages();
  return {};
}

export async function updateTeam(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const teamId = formData.get("teamId") as string;
  const name = (formData.get("name") as string)?.trim();
  const colorInput = (formData.get("color") as string) ?? DEFAULT_TEAM_COLOR;
  const color = isValidTeamColor(colorInput) ? colorInput : DEFAULT_TEAM_COLOR;

  if (!teamId || !name) return { error: "Team name is required." };

  try {
    await prisma.team.update({
      where: { id: teamId },
      data: { name, color },
    });
  } catch {
    return { error: "Could not update team — the name may already be in use." };
  }

  revalidateAdminPages();
  return {};
}

export async function updateTeamAllowance(
  teamId: string,
  yearlyAllowance: number
): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isFinite(yearlyAllowance) || yearlyAllowance < 0)
    return { error: "Allowance must be a non-negative number." };

  await prisma.team.update({
    where: { id: teamId },
    data: { yearlyAllowance },
  });

  revalidateAdminPages();
  return {};
}

async function assertLinkedAppKeyAvailable(
  linkedAppKey: string,
  excludeCardId?: string,
): Promise<boolean> {
  const existing = await prisma.toolCard.findFirst({
    where: {
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey,
      ...(excludeCardId ? { id: { not: excludeCardId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}

export async function createToolCard(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const iconKey = parseIconKey(formData);
  const kindFields = parseToolCardKindFields(formData);

  if (!name || !description || !url || !kindFields)
    return { error: "All fields are required." };
  if (!isValidToolCardUrl(url)) return { error: "Link URL must be a valid https:// URL." };
  if (
    kindFields.kind === ToolCardKind.APP_ACCESS &&
    kindFields.linkedAppKey &&
    !(await assertLinkedAppKeyAvailable(kindFields.linkedAppKey))
  ) {
    return { error: "Another card already links to this app." };
  }

  try {
    await prisma.toolCard.create({
      data: {
        name,
        description,
        url,
        iconKey,
        kind: kindFields.kind,
        linkedAppKey: kindFields.linkedAppKey,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "Another card already links to this app." };
    }
    throw error;
  }

  revalidateAdminPages();
  revalidatePath("/");
  return {};
}

export async function updateToolCard(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const cardId = formData.get("cardId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const iconKey = parseIconKey(formData);
  const kindFields = parseToolCardKindFields(formData);

  if (!cardId || !name || !description || !url || !kindFields)
    return { error: "All fields are required." };
  if (!isValidToolCardUrl(url)) return { error: "Link URL must be a valid https:// URL." };
  if (
    kindFields.kind === ToolCardKind.APP_ACCESS &&
    kindFields.linkedAppKey &&
    !(await assertLinkedAppKeyAvailable(kindFields.linkedAppKey, cardId))
  ) {
    return { error: "Another card already links to this app." };
  }

  try {
    await prisma.toolCard.update({
      where: { id: cardId },
      data: {
        name,
        description,
        url,
        iconKey,
        kind: kindFields.kind,
        linkedAppKey: kindFields.linkedAppKey,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "Another card already links to this app." };
    }
    throw error;
  }

  revalidateAdminPages();
  revalidatePath("/");
  return {};
}

export async function deleteToolCard(cardId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!cardId) return { error: "Missing card." };

  await prisma.toolCard.delete({ where: { id: cardId } });
  revalidateAdminPages();
  revalidatePath("/");
  return {};
}

export async function setCardAccess(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const cardId = formData.get("cardId") as string;
  if (!cardId) return { error: "Missing card." };

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
  return {};
}

export async function setUserAccess(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  if (!userId) return { error: "Missing user." };

  const cardIds = formData.getAll("cardId").map((id) => String(id));
  const makeAdmin = formData.get("makeAdmin") === "on";
  const grantHrRequested = formData.get("grantHr") === "on";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true, hrAccess: true },
  });
  if (!user) return { error: "User not found." };

  const grantHr = (await canGrantHrAccess(admin.id))
    ? grantHrRequested
    : user.hrAccess;

  if (user.systemRole === SystemRole.ADMIN && !makeAdmin) {
    const adminCount = await prisma.user.count({
      where: { systemRole: SystemRole.ADMIN },
    });
    if (adminCount <= 1)
      return { error: "Cannot remove admin access from the last admin." };
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
  return {};
}
