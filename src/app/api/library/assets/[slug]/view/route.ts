import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { sanitizeFilename } from "@/lib/content-disposition";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const asset = await prisma.libraryAsset.findUnique({
    where: { slug },
    select: { fileName: true, mimeType: true, storageKey: true },
  });

  if (!asset?.storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(asset.storageKey, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  const fileName = sanitizeFilename(asset.fileName, "dashboard.html");

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": asset.mimeType || "text/html",
      "Content-Disposition": `inline; filename="${fileName}"`,
      // Defense in depth: even if opened directly (not via the sandboxed
      // iframe), the document runs in an opaque origin with no cookie access.
      "Content-Security-Policy": "sandbox allow-scripts",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
