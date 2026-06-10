"use server";

import { auth } from "@/lib/auth";
import { hasHrAccess } from "@/lib/permissions";

export async function requireHr() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await hasHrAccess(session.user.id))) throw new Error("Forbidden");
  return session.user;
}
