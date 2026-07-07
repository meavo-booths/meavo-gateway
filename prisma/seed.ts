import { PrismaClient, SystemRole, Company, ToolCardKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim()?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail) {
    console.log("Set ADMIN_EMAILS in .env to seed an admin user.");
    return;
  }
  if (!adminPassword) {
    console.log("Set ADMIN_PASSWORD in .env to seed the admin password.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { systemRole: SystemRole.ADMIN, passwordHash },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      systemRole: SystemRole.ADMIN,
    },
  });

  const engineering = await prisma.team.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", yearlyAllowance: 25, color: "#E1E9EC" },
  });

  await prisma.teamMember.upsert({
    where: {
      userId_teamId: { userId: admin.id, teamId: engineering.id },
    },
    update: {},
    create: {
      userId: admin.id,
      teamId: engineering.id,
    },
  });

  const vacationCard = await prisma.toolCard.upsert({
    where: { id: "seed-vacation-tracker" },
    update: {
      name: "Vacation Tracker",
      description: "Request time off, view the team calendar, and manage approvals.",
      url: "https://hols.meavo.app",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "hols",
      sortOrder: 0,
      isActive: true,
    },
    create: {
      id: "seed-vacation-tracker",
      name: "Vacation Tracker",
      description: "Request time off, view the team calendar, and manage approvals.",
      url: "https://hols.meavo.app",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "hols",
      sortOrder: 0,
      isActive: true,
    },
  });

  await prisma.toolCardAccess.upsert({
    where: {
      userId_cardId: { userId: admin.id, cardId: vacationCard.id },
    },
    update: {},
    create: {
      userId: admin.id,
      cardId: vacationCard.id,
    },
  });

  const assemblyCard = await prisma.toolCard.upsert({
    where: { id: "seed-assembly-tool" },
    update: {
      name: "Assembly",
      description: "Install questionnaires for assembly partners.",
      url: "https://assembly.meavo.app",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "assembly",
      sortOrder: 1,
      isActive: true,
    },
    create: {
      id: "seed-assembly-tool",
      name: "Assembly",
      description: "Install questionnaires for assembly partners.",
      url: "https://assembly.meavo.app",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "assembly",
      sortOrder: 1,
      isActive: true,
    },
  });

  await prisma.toolCardAccess.upsert({
    where: {
      userId_cardId: { userId: admin.id, cardId: assemblyCard.id },
    },
    update: {},
    create: {
      userId: admin.id,
      cardId: assemblyCard.id,
    },
  });

  const salesCard = await prisma.toolCard.upsert({
    where: { id: "seed-sales-tool" },
    update: {
      name: "Sales",
      description: "Generate quotes and convert them into won deals.",
      url: "https://sales.meavo.app",
      iconKey: "handover",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "sales",
      sortOrder: 2,
      isActive: true,
    },
    create: {
      id: "seed-sales-tool",
      name: "Sales",
      description: "Generate quotes and convert them into won deals.",
      url: "https://sales.meavo.app",
      iconKey: "handover",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "sales",
      sortOrder: 2,
      isActive: true,
    },
  });

  await prisma.toolCardAccess.upsert({
    where: {
      userId_cardId: { userId: admin.id, cardId: salesCard.id },
    },
    update: {},
    create: {
      userId: admin.id,
      cardId: salesCard.id,
    },
  });

  const mrpCard = await prisma.toolCard.upsert({
    where: { id: "seed-mrp-tool" },
    update: {
      name: "MRP",
      description: "Scan invoices, track materials and stock, and sync to Zeron.",
      url: "https://mrp.meavo.app",
      iconKey: "replacement",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "mrp",
      sortOrder: 3,
      isActive: true,
    },
    create: {
      id: "seed-mrp-tool",
      name: "MRP",
      description: "Scan invoices, track materials and stock, and sync to Zeron.",
      url: "https://mrp.meavo.app",
      iconKey: "replacement",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "mrp",
      sortOrder: 3,
      isActive: true,
    },
  });

  await prisma.toolCardAccess.upsert({
    where: {
      userId_cardId: { userId: admin.id, cardId: mrpCard.id },
    },
    update: {},
    create: {
      userId: admin.id,
      cardId: mrpCard.id,
    },
  });

  const factoryCard = await prisma.toolCard.upsert({
    where: { id: "seed-factory-tool" },
    update: {
      name: "Factory",
      description: "Production monitoring: floor kiosks, schedule, and planning.",
      url: "https://factory.meavo.app",
      iconKey: "factory",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "factory",
      sortOrder: 4,
      isActive: true,
    },
    create: {
      id: "seed-factory-tool",
      name: "Factory",
      description: "Production monitoring: floor kiosks, schedule, and planning.",
      url: "https://factory.meavo.app",
      iconKey: "factory",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "factory",
      sortOrder: 4,
      isActive: true,
    },
  });

  await prisma.toolCardAccess.upsert({
    where: {
      userId_cardId: { userId: admin.id, cardId: factoryCard.id },
    },
    update: {},
    create: {
      userId: admin.id,
      cardId: factoryCard.id,
    },
  });

  const rpCard = await prisma.toolCard.upsert({
    where: { id: "seed-rp-tool" },
    update: {
      name: "RP",
      description: "Spare parts and panel order operations.",
      url: "https://rp.meavo.app",
      iconKey: "replacement",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "rp",
      sortOrder: 5,
      isActive: true,
    },
    create: {
      id: "seed-rp-tool",
      name: "RP",
      description: "Spare parts and panel order operations.",
      url: "https://rp.meavo.app",
      iconKey: "replacement",
      kind: ToolCardKind.APP_ACCESS,
      linkedAppKey: "rp",
      sortOrder: 5,
      isActive: true,
    },
  });

  await prisma.toolCardAccess.upsert({
    where: {
      userId_cardId: { userId: admin.id, cardId: rpCard.id },
    },
    update: {},
    create: {
      userId: admin.id,
      cardId: rpCard.id,
    },
  });

  for (const company of [Company.MEAVO, Company.OA]) {
    await prisma.companyProfile.upsert({
      where: { company },
      update: {},
      create: { company },
    });
  }

  await prisma.libraryAsset.upsert({
    where: { slug: "market-dashboard" },
    update: { title: "Marketing" },
    create: { slug: "market-dashboard", title: "Marketing" },
  });

  console.log(`Seeded admin (${adminEmail}), Engineering team, Vacation Tracker, Assembly, Sales, MRP, Factory and RP cards.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
