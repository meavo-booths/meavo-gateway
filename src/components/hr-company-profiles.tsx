"use client";

import { useState, useTransition } from "react";
import { updateCompanyProfile } from "@/app/actions/hr";
import type { CompanyProfileData } from "@/lib/company-profiles";
import { Button, Card, Input, Textarea } from "@/components/ui";

function profileSummary(profile: CompanyProfileData): string {
  const parts = [profile.legalName, profile.manager].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No details saved yet";
}

function HrCompanyProfileCard({ profile }: { profile: CompanyProfileData }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateCompanyProfile(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{profile.company}</h2>
          {!open && (
            <p className="mt-0.5 truncate text-sm text-slate-500">{profileSummary(profile)}</p>
          )}
        </div>
        {!open && (
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Edit
          </Button>
        )}
      </div>

      {open && (
        <form action={handleSubmit} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="company" value={profile.company} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Legal name"
              name="legalName"
              defaultValue={profile.legalName}
              placeholder="MEAVO Ltd."
            />
            <Input
              label="Име на фирмата"
              name="legalNameBg"
              defaultValue={profile.legalNameBg}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea label="Address" name="address" defaultValue={profile.address} rows={3} />
            <Textarea
              label="Адрес"
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
            <Input label="МОЛ" name="managerBg" defaultValue={profile.managerBg} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Extra tax per FTE (% of salary)"
              name="extraTaxFtePercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={profile.extraTaxFtePercent}
            />
            <Input
              label="Extra tax per Freelancer (% of salary)"
              name="extraTaxFreelancerPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={profile.extraTaxFreelancerPercent}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : `Save ${profile.company}`}
            </Button>
          </div>
        </form>
      )}
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
      <div className="grid gap-3 lg:grid-cols-2">
        {profiles.map((profile) => (
          <HrCompanyProfileCard key={profile.company} profile={profile} />
        ))}
      </div>
    </div>
  );
}
