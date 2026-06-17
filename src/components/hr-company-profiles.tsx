import { updateCompanyProfile } from "@/app/actions/hr";
import type { CompanyProfileData } from "@/lib/company-profiles";
import { Button, Card, Input, Textarea } from "@/components/ui";

export function HrCompanyProfileCard({ profile }: { profile: CompanyProfileData }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">{profile.company}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Legal and registration details used in contract templates.
      </p>
      <form action={updateCompanyProfile} className="mt-4 space-y-4">
        <input type="hidden" name="company" value={profile.company} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Legal name"
            name="legalName"
            defaultValue={profile.legalName}
            placeholder="MEAVO Ltd."
          />
          <Input
            label="Legal name (Име на фирмата)"
            name="legalNameBg"
            defaultValue={profile.legalNameBg}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            label="Address"
            name="address"
            defaultValue={profile.address}
            rows={3}
          />
          <Textarea
            label="Address (Адрес)"
            name="addressBg"
            defaultValue={profile.addressBg}
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company number"
            name="companyNumber"
            defaultValue={profile.companyNumber}
          />
          <Input label="VAT number" name="vatNumber" defaultValue={profile.vatNumber} />
          <Input label="DE VAT number" name="deVatNumber" defaultValue={profile.deVatNumber} />
          <Input label="EORI" name="eori" defaultValue={profile.eori} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Manager" name="manager" defaultValue={profile.manager} />
          <Input label="Manager (МОЛ)" name="managerBg" defaultValue={profile.managerBg} />
        </div>
        <Button type="submit">Save {profile.company}</Button>
      </form>
    </Card>
  );
}

export function HrCompanyProfiles({ profiles }: { profiles: CompanyProfileData[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
        <p className="mt-1 text-sm text-slate-500">
          Maintain employer details for MEAVO and OA when generating contracts and other documents.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {profiles.map((profile) => (
          <HrCompanyProfileCard key={profile.company} profile={profile} />
        ))}
      </div>
    </div>
  );
}
