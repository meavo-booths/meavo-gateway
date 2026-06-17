export type EmployeeDetailsData = {
  contract: "FTE" | "FREELANCE";
  employeeBirthdate: string | null;
  employeePersonalEmail: string;
  employeeHomeAddress: string;
  employeeHomeAddressBg: string;
  providerCompanyName: string;
  providerCompanyNameBg: string;
  providerCompanyAddress: string;
  providerCompanyAddressBg: string;
  providerCompanyRegNumber: string;
  providerCompanyVatNumber: string;
};

export function trimEmployeeField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseOptionalEmployeeDate(value: FormDataEntryValue | null): Date | null {
  const raw = trimEmployeeField(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseEmployeePersonalFields(formData: FormData) {
  return {
    employeeBirthdate: parseOptionalEmployeeDate(formData.get("employeeBirthdate")),
    employeePersonalEmail: trimEmployeeField(formData.get("employeePersonalEmail")),
    employeeHomeAddress: trimEmployeeField(formData.get("employeeHomeAddress")),
    employeeHomeAddressBg: trimEmployeeField(formData.get("employeeHomeAddressBg")),
  };
}

export function parseEmployeeProviderFields(formData: FormData) {
  return {
    providerCompanyName: trimEmployeeField(formData.get("providerCompanyName")),
    providerCompanyNameBg: trimEmployeeField(formData.get("providerCompanyNameBg")),
    providerCompanyAddress: trimEmployeeField(formData.get("providerCompanyAddress")),
    providerCompanyAddressBg: trimEmployeeField(formData.get("providerCompanyAddressBg")),
    providerCompanyRegNumber: trimEmployeeField(formData.get("providerCompanyRegNumber")),
    providerCompanyVatNumber: trimEmployeeField(formData.get("providerCompanyVatNumber")),
  };
}
