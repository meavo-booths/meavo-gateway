import { SystemRole, TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NotificationRecipient } from "@/lib/notifications/types";

const ASSEMBLY_TOOL_CARD_ID = "seed-assembly-tool";
const SALES_TOOL_CARD_ID = "seed-sales-tool";

function toRecipient(user: {
  id: string;
  email: string;
  name: string | null;
}): NotificationRecipient {
  return { userId: user.id, email: user.email, name: user.name };
}

function dedupeRecipients(recipients: NotificationRecipient[]): NotificationRecipient[] {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const key = recipient.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function allUsers(): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });
  return dedupeRecipients(users.map(toRecipient));
}

export async function userById(userId: string): Promise<NotificationRecipient | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  return user ? toRecipient(user) : null;
}

export async function teamManagersForUser(userId: string): Promise<NotificationRecipient[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  if (memberships.length === 0) return [];

  const teamIds = memberships.map((membership) => membership.teamId);
  const managers = await prisma.teamMember.findMany({
    where: { teamId: { in: teamIds }, role: TeamRole.MANAGER },
    select: { user: { select: { id: true, email: true, name: true } } },
  });

  return dedupeRecipients(managers.map((manager) => toRecipient(manager.user)));
}

export async function hrUsers(): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    where: { hrAccess: true },
    select: { id: true, email: true, name: true },
  });
  return users.map(toRecipient);
}

export async function admins(): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    where: { systemRole: SystemRole.ADMIN },
    select: { id: true, email: true, name: true },
  });
  return users.map(toRecipient);
}

export async function assemblyOperators(): Promise<NotificationRecipient[]> {
  const [adminUsers, cardUsers] = await Promise.all([
    admins(),
    prisma.toolCardAccess.findMany({
      where: { cardId: ASSEMBLY_TOOL_CARD_ID },
      select: { user: { select: { id: true, email: true, name: true } } },
    }),
  ]);

  return dedupeRecipients([
    ...adminUsers,
    ...cardUsers.map((access) => toRecipient(access.user)),
  ]);
}

export async function salesOperators(): Promise<NotificationRecipient[]> {
  const [adminUsers, cardUsers] = await Promise.all([
    admins(),
    prisma.toolCardAccess.findMany({
      where: { cardId: SALES_TOOL_CARD_ID },
      select: { user: { select: { id: true, email: true, name: true } } },
    }),
  ]);

  return dedupeRecipients([
    ...adminUsers,
    ...cardUsers.map((access) => toRecipient(access.user)),
  ]);
}
