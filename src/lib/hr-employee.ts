import { ContractType } from "@prisma/client";

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isActiveEmployee(employee: {
  endDate: Date | null;
  contract: ContractType;
}): boolean {
  if (employee.contract === ContractType.PAST_EMPLOYEE) return false;
  if (!employee.endDate) return true;
  return startOfUtcDay(employee.endDate) >= startOfUtcDay(new Date());
}

export function isPastEmployee(employee: {
  endDate: Date | null;
  contract: ContractType;
}): boolean {
  if (employee.contract === ContractType.PAST_EMPLOYEE) return true;
  if (!employee.endDate) return false;
  return startOfUtcDay(employee.endDate) < startOfUtcDay(new Date());
}

export function employeeTypeLabel(employee: {
  endDate: Date | null;
  contract: ContractType;
}): "Employee" | "Past Employee" {
  return isPastEmployee(employee) ? "Past Employee" : "Employee";
}

export function contractLabel(contract: ContractType): string {
  if (contract === ContractType.FTE) return "FTE";
  if (contract === ContractType.FREELANCE) return "Freelance";
  return "Past Employee";
}
