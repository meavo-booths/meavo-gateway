import { ensureCompanyProfiles } from "@/lib/company-profiles";
import { HrCompanyProfiles } from "@/components/hr-company-profiles";

export default async function HrDocumentationPage() {
  const profiles = await ensureCompanyProfiles();

  return <HrCompanyProfiles profiles={profiles} />;
}
