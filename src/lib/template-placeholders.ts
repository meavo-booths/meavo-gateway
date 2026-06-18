export type TemplatePlaceholderOption = {
  path: string;
  label: string;
  group: "company" | "employee" | "user";
};

export const TEMPLATE_PLACEHOLDER_OPTIONS: TemplatePlaceholderOption[] = [
  { path: "company.legalName", label: "Legal name", group: "company" },
  { path: "company.legalNameBg", label: "Име на фирмата", group: "company" },
  { path: "company.address", label: "Address", group: "company" },
  { path: "company.addressBg", label: "Адрес", group: "company" },
  { path: "company.companyNumber", label: "Company number", group: "company" },
  { path: "company.vatNumber", label: "VAT number", group: "company" },
  { path: "company.deVatNumber", label: "DE VAT number", group: "company" },
  { path: "company.eori", label: "EORI", group: "company" },
  { path: "company.manager", label: "Manager", group: "company" },
  { path: "company.managerBg", label: "МОЛ", group: "company" },
  { path: "employee.role", label: "Role", group: "employee" },
  { path: "employee.contract", label: "Contract type", group: "employee" },
  { path: "employee.company", label: "Employer company", group: "employee" },
  { path: "employee.startDate", label: "Start date", group: "employee" },
  { path: "employee.endDate", label: "End date", group: "employee" },
  { path: "employee.employeeBirthdate", label: "Birthdate", group: "employee" },
  { path: "employee.employeePersonalEmail", label: "Personal email", group: "employee" },
  { path: "employee.employeeHomeAddress", label: "Home address", group: "employee" },
  { path: "employee.employeeHomeAddressBg", label: "Адрес", group: "employee" },
  { path: "employee.providerCompanyName", label: "Provider company name", group: "employee" },
  { path: "employee.providerCompanyNameBg", label: "Име на фирма", group: "employee" },
  { path: "employee.providerCompanyAddress", label: "Provider company address", group: "employee" },
  { path: "employee.providerCompanyAddressBg", label: "Адрес на фирма", group: "employee" },
  { path: "employee.providerCompanyRegNumber", label: "Provider company Reg Number", group: "employee" },
  { path: "employee.providerCompanyVatNumber", label: "Provider company VAT Number", group: "employee" },
  { path: "user.name", label: "Display name", group: "user" },
  { path: "user.email", label: "Email", group: "user" },
];

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

export function extractPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_REGEX)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

export function extractCustomPlaceholders(body: string): string[] {
  return extractPlaceholders(body).filter((path) => path.startsWith("custom."));
}

export type MergeWarning = {
  placeholder: string;
  message: string;
};

export type MergeResult = {
  text: string;
  warnings: MergeWarning[];
};

export function mergeTemplate(
  body: string,
  values: Record<string, string>
): MergeResult {
  const warnings: MergeWarning[] = [];
  const seenWarnings = new Set<string>();

  const text = body.replace(PLACEHOLDER_REGEX, (_match, path: string) => {
    const value = values[path];
    if (value === undefined) {
      if (!seenWarnings.has(path)) {
        seenWarnings.add(path);
        warnings.push({
          placeholder: path,
          message: `Unknown placeholder "{{${path}}}".`,
        });
      }
      return "";
    }
    if (!value.trim()) {
      if (!seenWarnings.has(path)) {
        seenWarnings.add(path);
        warnings.push({
          placeholder: path,
          message: `Placeholder "{{${path}}}" is empty.`,
        });
      }
      return "";
    }
    return value;
  });

  return { text, warnings };
}

export function formatDateValue(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function contractLabel(contract: string): string {
  return contract === "FREELANCE" ? "Freelance" : "FTE";
}
