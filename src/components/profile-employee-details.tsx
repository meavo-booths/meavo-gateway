"use client";

import { useState, useTransition } from "react";
import {
  updateMyEmployeePersonalDetails,
  updateMyEmployeeProviderDetails,
} from "@/app/actions/profile";
import type { EmployeeDetailsData } from "@/lib/employee-details";
import { Button, Card, Input, Textarea } from "@/components/ui";

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function PersonalDetailsCard({ employee }: { employee: EmployeeDetailsData }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
      <p className="mt-1 text-sm text-slate-500">
        Used for contracts and HR documents. Keep this up to date.
      </p>
      <form
        className="mt-4 space-y-4"
        action={(formData) => {
          setError(null);
          setSuccess(false);
          startTransition(async () => {
            const result = await updateMyEmployeePersonalDetails(formData);
            if (result.error) {
              setError(result.error);
            } else {
              setSuccess(true);
            }
          });
        }}
      >
        <Input
          label="Birthdate"
          name="employeeBirthdate"
          type="date"
          defaultValue={toDateInputValue(employee.employeeBirthdate)}
        />
        <Input
          label="Personal email"
          name="employeePersonalEmail"
          type="email"
          defaultValue={employee.employeePersonalEmail}
          placeholder="name@personal.email"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            label="Home address"
            name="employeeHomeAddress"
            defaultValue={employee.employeeHomeAddress}
            rows={3}
          />
          <Textarea
            label="Адрес"
            name="employeeHomeAddressBg"
            defaultValue={employee.employeeHomeAddressBg}
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Personal details saved.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save personal details"}
        </Button>
      </form>
    </Card>
  );
}

function ProviderDetailsCard({ employee }: { employee: EmployeeDetailsData }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Company information</h2>
      <p className="mt-1 text-sm text-slate-500">
        Your freelance provider company details for MEAVO or OA contracts.
      </p>
      <form
        className="mt-4 space-y-4"
        action={(formData) => {
          setError(null);
          setSuccess(false);
          startTransition(async () => {
            const result = await updateMyEmployeeProviderDetails(formData);
            if (result.error) {
              setError(result.error);
            } else {
              setSuccess(true);
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            name="providerCompanyName"
            defaultValue={employee.providerCompanyName}
          />
          <Input
            label="Име на фирма"
            name="providerCompanyNameBg"
            defaultValue={employee.providerCompanyNameBg}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea
            label="Company address"
            name="providerCompanyAddress"
            defaultValue={employee.providerCompanyAddress}
            rows={3}
          />
          <Textarea
            label="Адрес на фирма"
            name="providerCompanyAddressBg"
            defaultValue={employee.providerCompanyAddressBg}
            rows={3}
          />
        </div>
        <Input
          label="Company Reg Number"
          name="providerCompanyRegNumber"
          defaultValue={employee.providerCompanyRegNumber}
        />
        <Input
          label="Company VAT Number"
          name="providerCompanyVatNumber"
          defaultValue={employee.providerCompanyVatNumber}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Company information saved.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save company information"}
        </Button>
      </form>
    </Card>
  );
}

export function ProfileEmployeeDetails({ employee }: { employee: EmployeeDetailsData }) {
  return (
    <div
      className={`mt-6 grid gap-6 ${employee.contract === "FREELANCE" ? "lg:grid-cols-2" : ""}`}
    >
      <PersonalDetailsCard employee={employee} />
      {employee.contract === "FREELANCE" && <ProviderDetailsCard employee={employee} />}
    </div>
  );
}
