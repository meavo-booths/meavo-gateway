import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
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

  const fileName = asset.fileName?.replace(/"/g, "") || "dashboard.html";

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": asset.mimeType || "text/html",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
