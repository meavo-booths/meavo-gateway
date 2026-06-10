import { Company, ContractType, Prisma } from "@prisma/client";
import { startOfUtcDay } from "@/lib/hr-employee";

export type HrUserTypeFilter = "user" | "employee" | "past_employee";
export type HrCompanyFilter = Company;
export type HrContractFilter = ContractType;

const USER_TYPE_VALUES: HrUserTypeFilter[] = ["user", "employee", "past_employee"];
const COMPANY_VALUES: HrCompanyFilter[] = [Company.MEAVO, Company.OA];
const CONTRACT_VALUES: HrContractFilter[] = [
  ContractType.FTE,
  ContractType.FREELANCE,
  ContractType.PAST_EMPLOYEE,
];

function parseMultiParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] {
  const allowedSet = new Set(allowed);
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const selected = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is T => allowedSet.has(part as T));

  return [...new Set(selected)];
}

function todayUtc(): Date {
  return startOfUtcDay(new Date());
}

function activeEmployeeWhere(
  extra: Prisma.EmployeeWhereInput = {}
): Prisma.EmployeeWhereInput {
  const today = todayUtc();
  return {
    AND: [
      extra,
      { contract: { not: ContractType.PAST_EMPLOYEE } },
      { OR: [{ endDate: null }, { endDate: { gte: today } }] },
    ],
  };
}

function pastEmployeeWhere(
  extra: Prisma.EmployeeWhereInput = {}
): Prisma.EmployeeWhereInput {
  const today = todayUtc();
  return {
    AND: [
      extra,
      {
        OR: [{ contract: ContractType.PAST_EMPLOYEE }, { endDate: { lt: today } }],
      },
    ],
  };
}

function employeeFieldFilters(
  companies: HrCompanyFilter[],
  contracts: HrContractFilter[]
): Prisma.EmployeeWhereInput {
  const filters: Prisma.EmployeeWhereInput = {};
  if (companies.length > 0) filters.company = { in: companies };
  if (contracts.length > 0) filters.contract = { in: contracts };
  return filters;
}

export function buildHrUserWhere({
  userTypes,
  companies,
  contracts,
}: {
  userTypes: HrUserTypeFilter[];
  companies: HrCompanyFilter[];
  contracts: HrContractFilter[];
}): Prisma.UserWhereInput {
  const employeeFilters = employeeFieldFilters(companies, contracts);
  const hasEmployeeFilters = Object.keys(employeeFilters).length > 0;

  if (userTypes.length === 0) {
    if (!hasEmployeeFilters) return {};
    return { employee: { is: employeeFilters } };
  }

  const typeConditions: Prisma.UserWhereInput[] = userTypes.map((userType) => {
    if (userType === "user") {
      return { employee: { is: null } };
    }
    if (userType === "employee") {
      return {
        employee: {
          is: hasEmployeeFilters ? activeEmployeeWhere(employeeFilters) : activeEmployeeWhere(),
        },
      };
    }
    return {
      employee: {
        is: hasEmployeeFilters ? pastEmployeeWhere(employeeFilters) : pastEmployeeWhere(),
      },
    };
  });

  if (typeConditions.length === 1) return typeConditions[0];
  return { OR: typeConditions };
}

export function parseHrFilters(searchParams: {
  userType?: string | string[];
  company?: string | string[];
  contract?: string | string[];
}) {
  return {
    userTypes: parseMultiParam(searchParams.userType, USER_TYPE_VALUES),
    companies: parseMultiParam(searchParams.company, COMPANY_VALUES),
    contracts: parseMultiParam(searchParams.contract, CONTRACT_VALUES),
  };
}
