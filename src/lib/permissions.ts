import { prisma } from "@/lib/prisma";

export const MARKET_DASHBOARD_SLUG = "market-dashboard";

function marketingTeamId(): string | null {
  const teamId = process.env.MARKETING_TEAM_ID?.trim();
  return teamId || null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  return user?.systemRole === "ADMIN";
}

export async function hasHrAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hrAccess: true },
  });
  return user?.hrAccess === true;
}

function hrAccessGrantorEmails(): string[] {
  return (process.env.HR_ACCESS_GRANTOR_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function canGrantHrAccess(userId: string): Promise<boolean> {
  const grantorEmails = hrAccessGrantorEmails();
  if (grantorEmails.length === 0) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return grantorEmails.includes(user?.email.toLowerCase() ?? "");
}

export async function canUploadLibraryAsset(userId: string, slug: string): Promise<boolean> {
  if (await isAdmin(userId)) return true;
  if (slug !== MARKET_DASHBOARD_SLUG) return false;

  const teamId = marketingTeamId();
  if (!teamId) return false;

  const membership = await prisma.teamMember.findFirst({
    where: { userId, teamId },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function canReplaceMarketDashboard(userId: string): Promise<boolean> {
  return canUploadLibraryAsset(userId, MARKET_DASHBOARD_SLUG);
}

/** Admins or marketing-team members may manage Library Useful links. */
export async function canManageUsefulLinks(userId: string): Promise<boolean> {
  if (await isAdmin(userId)) return true;

  const teamId = marketingTeamId();
  if (!teamId) return false;

  const membership = await prisma.teamMember.findFirst({
    where: { userId, teamId },
    select: { id: true },
  });
  return Boolean(membership);
}
