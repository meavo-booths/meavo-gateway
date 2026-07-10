import { Company } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const COMPANY_ORDER: Company[] = [Company.MEAVO, Company.OA];

export type CompanyProfileData = {
  company: Company;
  legalName: string;
  legalNameBg: string;
  address: string;
  addressBg: string;
  companyNumber: string;
  vatNumber: string;
  deVatNumber: string;
  eori: string;
  manager: string;
  managerBg: string;
  extraTaxFtePercent: string;
  extraTaxFreelancerPercent: string;
};

const EMPTY_PROFILE: Omit<CompanyProfileData, "company"> = {
  legalName: "",
  legalNameBg: "",
  address: "",
  addressBg: "",
  companyNumber: "",
  vatNumber: "",
  deVatNumber: "",
  eori: "",
  manager: "",
  managerBg: "",
  extraTaxFtePercent: "0",
  extraTaxFreelancerPercent: "0",
};

/**
 * Read-only: rows are created by the seed (prisma/seed.ts). A missing row
 * falls back to empty in-memory defaults; saving the HR form upserts it.
 */
export async function getCompanyProfiles(): Promise<CompanyProfileData[]> {
  const profiles = await prisma.companyProfile.findMany({
    where: { company: { in: COMPANY_ORDER } },
  });
  const byCompany = new Map(profiles.map((profile) => [profile.company, profile]));

  return COMPANY_ORDER.map((company) => {
    const profile = byCompany.get(company);
    if (!profile) return { company, ...EMPTY_PROFILE };
    return {
      company: profile.company,
      legalName: profile.legalName,
      legalNameBg: profile.legalNameBg,
      address: profile.address,
      addressBg: profile.addressBg,
      companyNumber: profile.companyNumber,
      vatNumber: profile.vatNumber,
      deVatNumber: profile.deVatNumber,
      eori: profile.eori,
      manager: profile.manager,
      managerBg: profile.managerBg,
      extraTaxFtePercent: profile.extraTaxFtePercent.toString(),
      extraTaxFreelancerPercent: profile.extraTaxFreelancerPercent.toString(),
    };
  });
}
