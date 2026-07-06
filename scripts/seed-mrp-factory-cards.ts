/**
 * One-shot: upsert the MRP + Factory tool cards and grant admins access.
 * Additive and idempotent — does not touch any other seed data.
 * Run: npx tsx --env-file=.env.local scripts/seed-mrp-factory-cards.ts
 */
import { PrismaClient, ToolCardKind, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

const CARDS = [
  {
    id: "seed-mrp-tool",
    name: "MRP",
    description: "Scan invoices, track materials and stock, and sync to Zeron.",
    url: "https://mrp.meavo.app",
    iconKey: "replacement",
    linkedAppKey: "mrp",
    sortOrder: 3,
  },
  {
    id: "seed-factory-tool",
    name: "Factory",
    description: "Production monitoring: floor kiosks, schedule, and planning.",
    url: "https://factory.meavo.app",
    iconKey: "factory",
    linkedAppKey: "factory",
    sortOrder: 4,
  },
];

async function main() {
  const admins = await prisma.user.findMany({
    where: { systemRole: SystemRole.ADMIN },
    select: { id: true, email: true },
  });

  for (const card of CARDS) {
    const data = { ...card, kind: ToolCardKind.APP_ACCESS, isActive: true };
    await prisma.toolCard.upsert({
      where: { id: card.id },
      update: data,
      create: data,
    });
    for (const admin of admins) {
      await prisma.toolCardAccess.upsert({
        where: { userId_cardId: { userId: admin.id, cardId: card.id } },
        update: {},
        create: { userId: admin.id, cardId: card.id },
      });
    }
    console.log(
      `Upserted ${card.id} and granted access to ${admins.length} admin(s): ${admins
        .map((a) => a.email)
        .join(", ")}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
