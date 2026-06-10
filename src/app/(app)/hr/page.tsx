import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildHrUserWhere, parseHrFilters } from "@/lib/hr-filters";
import { hasHrAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { HrFilters, HrUserList, type HrUserRow } from "@/components/hr-user-list";
import { PageHeader } from "@/components/ui";

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{
    userType?: string | string[];
    status?: string | string[];
    company?: string | string[];
    contract?: string | string[];
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasHrAccess(session.user.id))) redirect("/");

  const params = await searchParams;
  const filters = parseHrFilters(params);
  const where = buildHrUserWhere(filters);

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      teamMembers: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { team: { select: { name: true } } },
      },
      employee: {
        select: {
          id: true,
          company: true,
          contract: true,
          startDate: true,
          endDate: true,
          role: true,
          documents: {
            orderBy: { createdAt: "desc" },
            select: { id: true, fileName: true, createdAt: true },
          },
        },
      },
    },
  });

  const rows: HrUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    teamName: user.teamMembers[0]?.team.name ?? null,
    employee: user.employee
      ? {
          id: user.employee.id,
          company: user.employee.company,
          contract: user.employee.contract,
          startDate: user.employee.startDate.toISOString(),
          endDate: user.employee.endDate?.toISOString() ?? null,
          role: user.employee.role,
          documents: user.employee.documents.map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            createdAt: doc.createdAt.toISOString(),
          })),
        }
      : null,
  }));

  return (
    <div>
      <PageHeader
        title="HR"
        description="Confidential employee database. Access is restricted to HR users only."
      />
      <HrFilters
        userTypes={filters.userTypes}
        statuses={filters.statuses}
        companies={filters.companies}
        contracts={filters.contracts}
      />
      <HrUserList users={rows} />
    </div>
  );
}
