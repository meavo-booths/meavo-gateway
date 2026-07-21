/**
 * One-shot: upsert the Zeron Material Checker tool card and grant admins access.
 * Run: npx tsx --env-file=.env.local scripts/seed-zeron-tool-card.ts
 */
import { PrismaClient, ToolCardKind, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

const CARD = {
  id: "seed-zeron-tool",
  name: "Zeron Materials",
  description: "Review Zeron delivery unit-cost outliers from sheet exports.",
  url: "https://zeron.meavo.app",
  iconKey: "mrp",
  linkedAppKey: "zeron",
  sortOrder: 9,
};

async function main() {
  const admins = await prisma.user.findMany({
    where: { systemRole: SystemRole.ADMIN },
    select: { id: true, email: true },
  });

  const data = { ...CARD, kind: ToolCardKind.APP_ACCESS, isActive: true };
  await prisma.toolCard.upsert({
    where: { id: CARD.id },
    update: data,
    create: data,
  });

  for (const admin of admins) {
    await prisma.toolCardAccess.upsert({
      where: { userId_cardId: { userId: admin.id, cardId: CARD.id } },
      update: {},
      create: { userId: admin.id, cardId: CARD.id },
    });
  }

  console.log(
    `Upserted ${CARD.id} and granted access to ${admins.length} admin(s): ${admins
      .map((a) => a.email)
      .join(", ")}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
