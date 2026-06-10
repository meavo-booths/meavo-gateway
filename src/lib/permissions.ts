import { prisma } from "@/lib/prisma";

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
