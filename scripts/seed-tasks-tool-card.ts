/**
 * Seed the Tasks tool card in production.
 * Run: npx tsx --env-file=.env.local scripts/seed-tasks-tool-card.ts
 */
import { PrismaClient, ToolCardKind } from "@prisma/client";

const prisma = new PrismaClient();

const CARD = {
  id: "seed-tasks-tool",
  name: "Tasks",
  description: "Team task management — personal lists and shared boards.",
  url: "https://tasks.meavo.app",
  iconKey: "tasks",
  linkedAppKey: "tasks",
  sortOrder: 8,
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
    console.log(`Granted Tasks access to admin (${admin.email}).`);
  }

  console.log("Tasks tool card seeded:", card.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
