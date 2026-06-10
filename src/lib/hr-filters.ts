import { Company, ContractType, Prisma } from "@prisma/client";

export type HrUserTypeFilter = "all" | "user" | "employee";
export type HrCompanyFilter = "all" | Company;
export type HrContractFilter = "all" | ContractType;

export function buildHrUserWhere({
  userType,
  company,
  contract,
}: {
  userType: HrUserTypeFilter;
  company: HrCompanyFilter;
  contract: HrContractFilter;
}): Prisma.UserWhereInput {
  if (userType === "user") {
    return { employee: { is: null } };
  }

  const employeeFilters: Prisma.EmployeeWhereInput = {};
  if (company !== "all") employeeFilters.company = company;
  if (contract !== "all") employeeFilters.contract = contract;

  if (userType === "employee") {
    return Object.keys(employeeFilters).length > 0
      ? { employee: { is: employeeFilters } }
      : { employee: { isNot: null } };
  }

  if (Object.keys(employeeFilters).length > 0) {
    return { employee: { is: employeeFilters } };
  }

  return {};
}

export function parseHrFilters(searchParams: {
  userType?: string;
  company?: string;
  contract?: string;
}) {
  const userType: HrUserTypeFilter =
    searchParams.userType === "user" || searchParams.userType === "employee"
      ? searchParams.userType
      : "all";
  const company: HrCompanyFilter =
    searchParams.company === "MEAVO" || searchParams.company === "OA"
      ? searchParams.company
      : "all";
  const contract: HrContractFilter =
    searchParams.contract === "FTE" || searchParams.contract === "FREELANCE"
      ? searchParams.contract
      : "all";

  return { userType, company, contract };
}
