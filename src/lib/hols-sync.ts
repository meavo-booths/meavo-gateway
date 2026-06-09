import { TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { VACATION_TRACKER_CARD_ID } from "@/lib/vacation-tracker";

type TeamSyncPayload = {
  gatewayTeamId: string;
  name: string;
  color: string;
  yearlyAllowance: number;
};

type UserSyncPayload = {
  email: string;
  name: string | null;
  passwordHash: string;
  teamGatewayId: string;
  role: TeamRole;
};

function isConfigured(): boolean {
  return Boolean(process.env.HOLS_SYNC_URL && process.env.GATEWAY_SYNC_SECRET);
}

async function holsRequest(path: string, body: unknown): Promise<boolean> {
  if (!isConfigured()) {
    console.warn("[hols-sync] Skipped — set HOLS_SYNC_URL and GATEWAY_SYNC_SECRET");
    return false;
  }

  const url = `${process.env.HOLS_SYNC_URL!.replace(/\/$/, "")}${path}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GATEWAY_SYNC_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[hols-sync] ${path} failed (${res.status}): ${text}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[hols-sync] ${path} error:`, error);
    return false;
  }
}

export async function syncTeamToHols(teamId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;

  const payload: TeamSyncPayload = {
    gatewayTeamId: team.id,
    name: team.name,
    color: team.color,
    yearlyAllowance: team.yearlyAllowance,
  };

  await holsRequest("/api/sync/team", payload);
}

export async function syncUserToHols(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      passwordHash: true,
      teamMembers: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          teamId: true,
        },
      },
    },
  });

  if (!user?.passwordHash) return;

  const membership = user.teamMembers[0];
  if (!membership) return;

  await syncTeamToHols(membership.teamId);

  const payload: UserSyncPayload = {
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    teamGatewayId: membership.teamId,
    role: membership.role,
  };

  await holsRequest("/api/sync/user", payload);
}

export async function revokeUserFromHols(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return;

  await holsRequest("/api/sync/user/revoke", { email: user.email });
}

export async function userHasVacationAccess(userId: string): Promise<boolean> {
  const access = await prisma.toolCardAccess.findUnique({
    where: {
      userId_cardId: { userId, cardId: VACATION_TRACKER_CARD_ID },
    },
  });
  return Boolean(access);
}

export async function syncUserToHolsIfHasAccess(userId: string): Promise<void> {
  if (!(await userHasVacationAccess(userId))) return;
  await syncUserToHols(userId);
}

export async function syncVacationAccessChanges(
  previousUserIds: string[],
  nextUserIds: string[]
): Promise<void> {
  const previous = new Set(previousUserIds);
  const next = new Set(nextUserIds);

  await Promise.all([
    ...[...previous]
      .filter((id) => !next.has(id))
      .map((id) => revokeUserFromHols(id)),
    ...[...next]
      .filter((id) => !previous.has(id))
      .map((id) => syncUserToHols(id)),
  ]);
}
