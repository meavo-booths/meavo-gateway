import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { sanitizeFilename } from "@/lib/content-disposition";
import { hasHrAccess } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(await hasHrAccess(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.employeeDocument.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true, storageKey: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(doc.storageKey, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": doc.mimeType || result.blob.contentType,
      "Content-Disposition": `inline; filename="${sanitizeFilename(doc.fileName, "document")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
