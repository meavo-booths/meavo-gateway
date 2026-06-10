import { NextResponse } from "next/server";
import { head } from "@vercel/blob";
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

  const blob = await head(doc.storageKey);
  if (!blob?.downloadUrl) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  const fileRes = await fetch(blob.downloadUrl);
  if (!fileRes.ok) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  const body = await fileRes.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
    },
  });
}
