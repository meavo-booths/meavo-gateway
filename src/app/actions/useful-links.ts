"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageUsefulLinks } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseIconKey } from "@/lib/tool-card-icons";

export type ActionResult = { error?: string };

async function requireUsefulLinksManager() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!(await canManageUsefulLinks(session.user.id))) throw new Error("Forbidden");
  return session.user;
}

function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function revalidateUsefulLinks() {
  revalidatePath("/library/useful-links");
}

export async function createUsefulLink(formData: FormData): Promise<ActionResult> {
  const user = await requireUsefulLinksManager();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const iconKey = parseIconKey(formData);

  if (!name || !description || !url) return { error: "All fields are required." };
  if (!isValidHttpsUrl(url)) return { error: "Link URL must be a valid https:// URL." };

  const { _max } = await prisma.usefulLink.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (_max.sortOrder ?? -1) + 1;

  await prisma.usefulLink.create({
    data: {
      name,
      description,
      url,
      iconKey,
      sortOrder,
      createdById: user.id,
    },
  });

  revalidateUsefulLinks();
  return {};
}

export async function updateUsefulLink(formData: FormData): Promise<ActionResult> {
  await requireUsefulLinksManager();
  const linkId = formData.get("linkId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const iconKey = parseIconKey(formData);

  if (!linkId || !name || !description || !url) return { error: "All fields are required." };
  if (!isValidHttpsUrl(url)) return { error: "Link URL must be a valid https:// URL." };

  await prisma.usefulLink.update({
    where: { id: linkId },
    data: { name, description, url, iconKey },
  });

  revalidateUsefulLinks();
  return {};
}

export async function deleteUsefulLink(linkId: string): Promise<ActionResult> {
  await requireUsefulLinksManager();
  if (!linkId) return { error: "Missing link." };

  await prisma.usefulLink.delete({ where: { id: linkId } });
  revalidateUsefulLinks();
  return {};
}
