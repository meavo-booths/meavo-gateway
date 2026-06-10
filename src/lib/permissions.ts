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
