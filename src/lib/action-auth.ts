import { auth } from "@/lib/auth";
import { hasHrAccess, isAdmin } from "@/lib/permissions";

/**
 * Shared Server Action guards. Auth failures throw (they only occur on
 * direct/malicious calls — the UI never renders these actions to
 * unauthorised users); user-facing validation failures should return
 * `{ error: string }` from the action instead.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!(await isAdmin(user.id))) throw new Error("Forbidden");
  return user;
}

export async function requireHr() {
  const user = await requireUser();
  if (!(await hasHrAccess(user.id))) throw new Error("Forbidden");
  return user;
}
