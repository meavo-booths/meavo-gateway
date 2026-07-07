/**
 * One-shot: upsert the RP tool card and grant admins access.
 * Run: npx tsx --env-file=.env.local scripts/seed-rp-tool-card.ts
 */
import { PrismaClient, ToolCardKind, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

const CARD = {
  id: "seed-rp-tool",
  name: "RP",
  description: "Spare parts and panel order operations.",
  url: "https://rp.meavo.app",
  iconKey: "replacement",
  linkedAppKey: "rp",
  sortOrder: 5,
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
