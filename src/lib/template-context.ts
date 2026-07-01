import { Company } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  contractLabel,
  extractPlaceholders,
  formatDateValue,
  type MergeWarning,
} from "@/lib/template-placeholders";

export type TemplateContextValues = Record<string, string>;

export async function buildTemplateContextValues({
  subjectUserId,
  company,
}: {
  subjectUserId: string | null;
  company: Company | null;
}): Promise<{ values: TemplateContextValues; warnings: MergeWarning[] }> {
  const values: TemplateContextValues = {};
  const warnings: MergeWarning[] = [];

  if (company) {
    const profile = await prisma.companyProfile.findUnique({ where: { company } });
    if (!profile) {
      warnings.push({
        placeholder: "company.*",
        message: `No company profile found for ${company}.`,
      });
    } else {
      values["company.legalName"] = profile.legalName;
      values["company.legalNameBg"] = profile.legalNameBg;
      values["company.address"] = profile.address;
      values["company.addressBg"] = profile.addressBg;
      values["company.companyNumber"] = profile.companyNumber;
      values["company.vatNumber"] = profile.vatNumber;
      values["company.deVatNumber"] = profile.deVatNumber;
      values["company.eori"] = profile.eori;
      values["company.manager"] = profile.manager;
      values["company.managerBg"] = profile.managerBg;
      values["company.extraTaxFtePercent"] = profile.extraTaxFtePercent.toString();
      values["company.extraTaxFreelancerPercent"] = profile.extraTaxFreelancerPercent.toString();
    }
  }

  if (subjectUserId) {
    const user = await prisma.user.findUnique({
      where: { id: subjectUserId },
      select: {
        name: true,
        email: true,
        employee: true,
      },
    });

    if (!user) {
      warnings.push({
        placeholder: "user.*",
        message: "Selected user was not found.",
      });
    } else {
      values["user.name"] = user.name ?? "";
      values["user.email"] = user.email;

      if (!user.employee) {
        warnings.push({
          placeholder: "employee.*",
          message: "Selected user is not an employee — employee fields will be empty.",
        });
      } else {
        const employee = user.employee;
        values["employee.role"] = employee.role;
        values["employee.contract"] = contractLabel(employee.contract);
        values["employee.company"] = employee.company;
        values["employee.startDate"] = formatDateValue(employee.startDate);
        values["employee.endDate"] = formatDateValue(employee.endDate);
        values["employee.employeeBirthdate"] = formatDateValue(employee.employeeBirthdate);
        values["employee.employeePersonalEmail"] = employee.employeePersonalEmail;
        values["employee.employeeHomeAddress"] = employee.employeeHomeAddress;
        values["employee.employeeHomeAddressBg"] = employee.employeeHomeAddressBg;
        values["employee.providerCompanyName"] = employee.providerCompanyName;
        values["employee.providerCompanyNameBg"] = employee.providerCompanyNameBg;
        values["employee.providerCompanyAddress"] = employee.providerCompanyAddress;
        values["employee.providerCompanyAddressBg"] = employee.providerCompanyAddressBg;
        values["employee.providerCompanyRegNumber"] = employee.providerCompanyRegNumber;
        values["employee.providerCompanyVatNumber"] = employee.providerCompanyVatNumber;
        values["employee.yearlySalary"] = employee.yearlySalary?.toString() ?? "";
      }
    }
  }

  return { values, warnings };
}

export function applyOverrides(
  base: TemplateContextValues,
  overrides: Record<string, string>
): TemplateContextValues {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = value;
  }
  return merged;
}

export function emptyWarningsForPlaceholders(
  placeholders: string[],
  values: TemplateContextValues
): MergeWarning[] {
  return placeholders
    .filter((path) => !values[path]?.trim())
    .map((path) => ({
      placeholder: path,
      message: `Placeholder "{{${path}}}" is empty.`,
    }));
}
