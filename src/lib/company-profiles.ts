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
};

export async function ensureCompanyProfiles(): Promise<CompanyProfileData[]> {
  for (const company of COMPANY_ORDER) {
    await prisma.companyProfile.upsert({
      where: { company },
      update: {},
      create: { company },
    });
  }

  const profiles = await prisma.companyProfile.findMany({
    where: { company: { in: COMPANY_ORDER } },
    orderBy: { company: "asc" },
  });

  return profiles.map((profile) => ({
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
  }));
}
