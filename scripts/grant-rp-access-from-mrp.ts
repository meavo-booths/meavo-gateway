/**
 * Grant seed-rp-tool access to every user who already has seed-mrp-tool access.
 * Run: DATABASE_URL=... npx tsx scripts/grant-rp-access-from-mrp.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mrpAccess = await prisma.toolCardAccess.findMany({
    where: { cardId: "seed-mrp-tool" },
    select: { userId: true },
  });

  for (const { userId } of mrpAccess) {
    await prisma.toolCardAccess.upsert({
      where: { userId_cardId: { userId, cardId: "seed-rp-tool" } },
      update: {},
      create: { userId, cardId: "seed-rp-tool" },
    });
  }

  console.log(`Granted RP access to ${mrpAccess.length} MRP user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
