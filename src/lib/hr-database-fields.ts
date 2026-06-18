import { TEMPLATE_PLACEHOLDER_OPTIONS } from "@/lib/template-placeholders";

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

const COMPANY_PROFILE_FIELDS: HrDatabaseField[] = [
  { name: "company.legalName", label: "Legal name", type: "String", notes: "DB: legalName" },
  { name: "company.legalNameBg", label: "Име на фирмата", type: "String", notes: "DB: legalNameBg" },
  { name: "company.address", label: "Address", type: "String", notes: "DB: address" },
  { name: "company.addressBg", label: "Адрес", type: "String", notes: "DB: addressBg" },
  { name: "company.companyNumber", label: "Company number", type: "String" },
  { name: "company.vatNumber", label: "VAT number", type: "String" },
  { name: "company.deVatNumber", label: "DE VAT number", type: "String" },
  { name: "company.eori", label: "EORI", type: "String" },
  { name: "company.manager", label: "Manager", type: "String" },
  { name: "company.managerBg", label: "МОЛ", type: "String", notes: "DB: managerBg" },
];

const EMPLOYEE_FIELDS: HrDatabaseField[] = TEMPLATE_PLACEHOLDER_OPTIONS.filter(
  (option) => option.group === "employee"
).map((option) => ({
  name: option.path,
  label: option.label,
  type: "String",
}));

const USER_FIELDS: HrDatabaseField[] = TEMPLATE_PLACEHOLDER_OPTIONS.filter(
  (option) => option.group === "user"
).map((option) => ({
  name: option.path,
  label: option.label,
  type: "String",
}));

export const HR_DATABASE_SECTIONS: HrDatabaseSection[] = [
  {
    title: "MEAVO & OA company profiles",
    description:
      "One row per company in CompanyProfile. Use {{company.fieldName}} in templates. Edited on Documentation.",
    table: "CompanyProfile",
    fields: COMPANY_PROFILE_FIELDS,
  },
  {
    title: "Employee fields",
    description: "On Employee, linked to User. Use {{employee.fieldName}} in templates. Edited on Profile.",
    table: "Employee",
    fields: EMPLOYEE_FIELDS,
  },
  {
    title: "User fields",
    description: "From User. Use {{user.fieldName}} in templates.",
    table: "User",
    fields: USER_FIELDS,
  },
  {
    title: "Custom placeholders",
    description:
      "No database backing. Type any {{custom.name}} in a template — it appears at generate time for free-text entry.",
    table: "—",
    fields: [{ name: "custom.*", label: "Custom field", type: "String", notes: "Example: {{custom.salary}}" }],
  },
];
