"use server";

import { revalidatePath } from "next/cache";
import { del, put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);

function isHtmlFile(file: File): boolean {
  if (HTML_MIME_TYPES.has(file.type)) return true;
  return file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm");
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

type UploadState = { error?: string; ok?: boolean } | null;

export async function uploadLibraryAsset(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const user = await requireUser();

  const slug = (formData.get("slug") as string)?.trim();
  const file = formData.get("file");

  if (!slug) {
    return { error: "Library section is required." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "An HTML file is required." };
  }

  if (!isHtmlFile(file)) {
    return { error: "Only HTML files are allowed." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: "File must be 10 MB or smaller." };
  }

  const asset = await prisma.libraryAsset.findUnique({
    where: { slug },
    select: { id: true, storageKey: true, title: true },
  });

  if (!asset) {
    return { error: "Library section not found." };
  }

  const blob = await put(`library/${slug}/${Date.now()}-${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  if (asset.storageKey) {
    try {
      await del(asset.storageKey);
    } catch {
      // Previous blob may already be gone.
    }
  }

  await prisma.libraryAsset.update({
    where: { id: asset.id },
    data: {
      fileName: file.name,
      mimeType: file.type || "text/html",
      storageKey: blob.pathname,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/library/${slug}`);
  return { ok: true };
}
