export type HrDatabaseField = {
  name: string;
  label: string;
  type: string;
  notes?: string;
};

export type HrDatabaseSection = {
  title: string;
  description: string;
  table: string;
  fields: HrDatabaseField[];
};

export const HR_DATABASE_SECTIONS: HrDatabaseSection[] = [
  {
    title: "MEAVO & OA company profiles",
    description: "One row per company in CompanyProfile (company = MEAVO or OA). Edited on Documentation.",
    table: "CompanyProfile",
    fields: [
      { name: "company", label: "—", type: "Company", notes: "Primary key (MEAVO / OA)" },
      { name: "legalName", label: "Legal name", type: "String" },
      { name: "legalNameBg", label: "Име на фирмата", type: "String" },
      { name: "address", label: "Address", type: "String", notes: "Free text" },
      { name: "addressBg", label: "Адрес", type: "String" },
      { name: "companyNumber", label: "Company number", type: "String" },
      { name: "vatNumber", label: "VAT number", type: "String" },
      { name: "deVatNumber", label: "DE VAT number", type: "String" },
      { name: "eori", label: "EORI", type: "String" },
      { name: "manager", label: "Manager", type: "String" },
      { name: "managerBg", label: "МОЛ", type: "String" },
      { name: "createdAt", label: "—", type: "DateTime", notes: "Auto" },
      { name: "updatedAt", label: "—", type: "DateTime", notes: "Auto" },
    ],
  },
  {
    title: "Employee personal details",
    description: "On Employee, linked to User via userId. Edited by the employee on Profile.",
    table: "Employee",
    fields: [
      { name: "employeeBirthdate", label: "Birthdate", type: "Date?", notes: "Nullable" },
      { name: "employeePersonalEmail", label: "Personal email", type: "String" },
      { name: "employeeHomeAddress", label: "Home address", type: "String" },
      { name: "employeeHomeAddressBg", label: "Адрес", type: "String" },
    ],
  },
  {
    title: "Employee provider details",
    description: "Freelance employees only (contract = FREELANCE). Edited by the employee on Profile.",
    table: "Employee",
    fields: [
      { name: "providerCompanyName", label: "Company name", type: "String" },
      { name: "providerCompanyNameBg", label: "Име на фирма", type: "String" },
      { name: "providerCompanyAddress", label: "Company address", type: "String" },
      { name: "providerCompanyAddressBg", label: "Адрес на фирма", type: "String" },
      { name: "providerCompanyRegNumber", label: "Company Reg Number", type: "String" },
      { name: "providerCompanyVatNumber", label: "Company VAT Number", type: "String" },
    ],
  },
];
