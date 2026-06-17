"use client";

import { useState, useTransition } from "react";
import {
  updateEmployeePersonalDetails,
  updateEmployeeProviderDetails,
} from "@/app/actions/hr";
import { Button, Card, Input, Textarea } from "@/components/ui";

export type HrEmployeeDetailsData = {
  id: string;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function personalSummary(employee: HrEmployeeDetailsData): string {
  const parts = [
    employee.employeeBirthdate ? formatDate(employee.employeeBirthdate) : "",
    employee.employeePersonalEmail,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No details saved yet";
}

function providerSummary(employee: HrEmployeeDetailsData): string {
  return employee.providerCompanyName || "No details saved yet";
}

function DetailRows({
  rows,
}: {
  rows: { label: string; value: string | null | undefined }[];
}) {
  const filled = rows.filter((row) => row.value);
  if (filled.length === 0) {
    return <p className="text-sm text-slate-500">No details saved yet.</p>;
  }

  return (
    <dl className="space-y-1.5">
      {filled.map((row) => (
        <div key={row.label} className="text-sm">
          <dt className="font-medium text-slate-700">{row.label}</dt>
          <dd className="text-slate-600">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HrEmployeePersonalDetailsCard({ employee }: { employee: HrEmployeeDetailsData }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">Personal details</h3>
          {!open && (
            <p className="mt-1 truncate text-sm text-slate-500 sm:hidden">{personalSummary(employee)}</p>
          )}
          {!open && (
            <div className="mt-2 hidden sm:block">
              <DetailRows
                rows={[
                  {
                    label: "Birthdate",
                    value: employee.employeeBirthdate
                      ? formatDate(employee.employeeBirthdate)
                      : null,
                  },
                  { label: "Personal email", value: employee.employeePersonalEmail },
                  { label: "Home address", value: employee.employeeHomeAddress },
                  { label: "Home address (Адрес)", value: employee.employeeHomeAddressBg },
                ]}
              />
            </div>
          )}
        </div>
        {!open && (
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Edit
          </Button>
        )}
      </div>

      {open && (
        <form
          className="mt-4 space-y-4 border-t border-slate-100 pt-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await updateEmployeePersonalDetails(formData);
              if (result.error) {
                setError(result.error);
              } else {
                setOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="employeeId" value={employee.id} />
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
              label="Home address (Адрес)"
              name="employeeHomeAddressBg"
              defaultValue={employee.employeeHomeAddressBg}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function HrEmployeeProviderDetailsCard({ employee }: { employee: HrEmployeeDetailsData }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">Company information</h3>
          <p className="mt-0.5 text-xs text-slate-500">Freelance provider details</p>
          {!open && (
            <p className="mt-1 truncate text-sm text-slate-500 sm:hidden">{providerSummary(employee)}</p>
          )}
          {!open && (
            <div className="mt-2 hidden sm:block">
              <DetailRows
                rows={[
                  { label: "Company name", value: employee.providerCompanyName },
                  { label: "Company name (Име на фирма)", value: employee.providerCompanyNameBg },
                  { label: "Company address", value: employee.providerCompanyAddress },
                  {
                    label: "Company address (Адрес на фирма)",
                    value: employee.providerCompanyAddressBg,
                  },
                  { label: "Company Reg Number", value: employee.providerCompanyRegNumber },
                  { label: "Company VAT Number", value: employee.providerCompanyVatNumber },
                ]}
              />
            </div>
          )}
        </div>
        {!open && (
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Edit
          </Button>
        )}
      </div>

      {open && (
        <form
          className="mt-4 space-y-4 border-t border-slate-100 pt-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await updateEmployeeProviderDetails(formData);
              if (result.error) {
                setError(result.error);
              } else {
                setOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="employeeId" value={employee.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Company name"
              name="providerCompanyName"
              defaultValue={employee.providerCompanyName}
            />
            <Input
              label="Company name (Име на фирма)"
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
              label="Company address (Адрес на фирма)"
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
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export function HrEmployeeDetailsCards({ employee }: { employee: HrEmployeeDetailsData }) {
  return (
    <div
      className={`mt-4 grid gap-3 ${employee.contract === "FREELANCE" ? "lg:grid-cols-2" : ""}`}
    >
      <HrEmployeePersonalDetailsCard employee={employee} />
      {employee.contract === "FREELANCE" && (
        <HrEmployeeProviderDetailsCard employee={employee} />
      )}
    </div>
  );
}
