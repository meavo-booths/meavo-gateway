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

function hrAccessGrantorEmail(): string | null {
  const email = process.env.HR_ACCESS_GRANTOR_EMAIL?.trim().toLowerCase();
  return email || null;
}

export async function canGrantHrAccess(userId: string): Promise<boolean> {
  const grantorEmail = hrAccessGrantorEmail();
  if (!grantorEmail) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email.toLowerCase() === grantorEmail;
}
