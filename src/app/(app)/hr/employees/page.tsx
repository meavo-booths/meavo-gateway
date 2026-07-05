import Link from "next/link";
import { buildHrUserWhere, parseHrFilters } from "@/lib/hr-filters";
import { prisma } from "@/lib/prisma";
import { HrFilters } from "@/components/hr-filters";
import { HrUserList, type HrUserRow } from "@/components/hr-user-list";

const PAGE_SIZE = 25;

export default async function HrEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    userType?: string | string[];
    status?: string | string[];
    company?: string | string[];
    contract?: string | string[];
    team?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const validTeamIds = teams.map((team) => team.id);
  const filters = parseHrFilters(params, validTeamIds);
  const where = buildHrUserWhere(filters);

  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const requestedPage = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Math.min(
    totalPages,
    Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1,
  );

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ name: "asc" }, { email: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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
          yearlySalary: true,
          salaryHistory: {
            orderBy: { effectiveFrom: "desc" },
            select: {
              id: true,
              yearlySalary: true,
              effectiveFrom: true,
              note: true,
              changedBy: { select: { name: true, email: true } },
            },
          },
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
          yearlySalary: user.employee.yearlySalary?.toString() ?? null,
          salaryHistory: user.employee.salaryHistory.map((entry) => ({
            id: entry.id,
            yearlySalary: entry.yearlySalary.toString(),
            effectiveFrom: entry.effectiveFrom.toISOString(),
            note: entry.note,
            changedByLabel: entry.changedBy.name || entry.changedBy.email,
          })),
          documents: user.employee.documents.map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            createdAt: doc.createdAt.toISOString(),
          })),
        }
      : null,
  }));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) query.append(key, v);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/hr/employees?${qs}` : "/hr/employees";
  };

  return (
    <div>
      <HrFilters
        basePath="/hr/employees"
        userTypes={filters.userTypes}
        statuses={filters.statuses}
        companies={filters.companies}
        contracts={filters.contracts}
        teams={filters.teams}
        teamOptions={teamOptions}
      />
      <HrUserList users={rows} />
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-medium text-brand-700 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {totalPages} · {totalUsers} user{totalUsers !== 1 ? "s" : ""}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="font-medium text-brand-700 hover:underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
