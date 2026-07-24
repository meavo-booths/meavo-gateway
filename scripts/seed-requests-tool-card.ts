/**
 * Seed the Requests tool card in production.
 * Run: npx tsx --env-file=.env.local scripts/seed-requests-tool-card.ts
 */
import { PrismaClient, ToolCardKind } from "@prisma/client";

const prisma = new PrismaClient();

const CARD = {
  id: "seed-requests-tool",
  name: "Requests",
  description: "Feature and change requests with voting.",
  url: "https://requests.meavo.app",
  iconKey: "requests",
  linkedAppKey: "requests",
  sortOrder: 10,
};

async function main() {
  const card = await prisma.toolCard.upsert({
    where: { id: CARD.id },
    update: {
      name: CARD.name,
      description: CARD.description,
      url: CARD.url,
      iconKey: CARD.iconKey,
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: CARD.linkedAppKey,
      sortOrder: CARD.sortOrder,
      isActive: true,
    },
    create: {
      ...CARD,
      kind: ToolCardKind.APP_ACCESS,
      isActive: true,
    },
  });

  const admin = await prisma.user.findFirst({
    where: { systemRole: "ADMIN" },
    select: { id: true, email: true },
  });

  if (admin) {
    await prisma.toolCardAccess.upsert({
      where: { userId_cardId: { userId: admin.id, cardId: card.id } },
      update: {},
      create: { userId: admin.id, cardId: card.id },
    });
    console.log(`Granted Requests access to admin (${admin.email}).`);
  }

  console.log("Requests tool card seeded:", card.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
