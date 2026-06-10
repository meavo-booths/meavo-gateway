"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteEmployeeDocument,
  endEmployeeContract,
  hireEmployee,
  updateEmployee,
  uploadEmployeeDocument,
} from "@/app/actions/hr";
import {
  contractLabel,
  employeeTypeLabel,
  isActiveEmployee,
} from "@/lib/hr-employee";
import { Button, Card, Input, Select } from "@/components/ui";

type HrDocument = {
  id: string;
  fileName: string;
  createdAt: string;
};

type HrEmployee = {
  id: string;
  company: "MEAVO" | "OA";
  contract: "FTE" | "FREELANCE" | "PAST_EMPLOYEE";
  startDate: string;
  endDate: string | null;
  role: string;
  documents: HrDocument[];
};

export type HrUserRow = {
  id: string;
  name: string | null;
  email: string;
  teamName: string | null;
  employee: HrEmployee | null;
};

const COMPANY_OPTIONS = [
  { value: "MEAVO", label: "MEAVO" },
  { value: "OA", label: "OA" },
];

const CONTRACT_OPTIONS = [
  { value: "FTE", label: "FTE" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "PAST_EMPLOYEE", label: "Past Employee" },
];

function Modal({
  title,
  open,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl border border-slate-200 bg-white p-6 shadow-lg ${wide ? "max-w-lg" : "max-w-sm"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function employeeForStatus(employee: HrEmployee) {
  return {
    endDate: employee.endDate ? new Date(employee.endDate) : null,
    contract: employee.contract,
  };
}

function HrUserRowItem({ user }: { user: HrUserRow }) {
  const displayName = user.name ?? user.email;
  const [hireOpen, setHireOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hirePending, startHireTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [endPending, startEndTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const employeeStatus = user.employee ? employeeForStatus(user.employee) : null;
  const typeLabel = user.employee
    ? employeeTypeLabel(employeeStatus!)
    : "User";
  const isActive = user.employee ? isActiveEmployee(employeeStatus!) : false;

  return (
    <>
      <li className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-slate-900">{displayName}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                typeLabel === "Employee"
                  ? "bg-brand-50 text-brand-700"
                  : typeLabel === "Past Employee"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {typeLabel}
            </span>
          </div>
          {user.name && <p className="truncate text-sm text-slate-500">{user.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            {user.teamName ? `Team: ${user.teamName}` : "No team assigned"}
          </p>
          {user.employee && (
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>
                {user.employee.company} · {contractLabel(user.employee.contract)} · Started{" "}
                {formatDate(user.employee.startDate)}
              </p>
              {user.employee.endDate && (
                <p>Contract ends {formatDate(user.employee.endDate)}</p>
              )}
              <p>Role: {user.employee.role}</p>
              {user.employee.documents.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {user.employee.documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/api/hr/documents/${doc.id}`}
                        className="text-brand-700 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {doc.fileName}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {formatDate(doc.createdAt)}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        disabled={deletePending}
                        onClick={() =>
                          startDeleteTransition(async () => {
                            await deleteEmployeeDocument(doc.id);
                          })
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!user.employee && (
            <Button type="button" onClick={() => setHireOpen(true)}>
              Hire
            </Button>
          )}
          {user.employee && (
            <>
              <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              {isActive && (
                <Button type="button" variant="secondary" onClick={() => setEndOpen(true)}>
                  End contract
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setUploadOpen(true)}>
                Attach contract
              </Button>
            </>
          )}
        </div>
      </li>

      <Modal title={`Hire — ${displayName}`} open={hireOpen} onClose={() => setHireOpen(false)} wide>
        <form
          className="space-y-4"
          action={(formData) => {
            setHireError(null);
            startHireTransition(async () => {
              const result = await hireEmployee(formData);
              if (result.error) {
                setHireError(result.error);
              } else {
                setHireOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="userId" value={user.id} />
          <Select label="Company" name="company" required options={COMPANY_OPTIONS} />
          <Select
            label="Contract"
            name="contract"
            required
            options={CONTRACT_OPTIONS.filter((option) => option.value !== "PAST_EMPLOYEE")}
          />
          <Input label="Starting date" name="startDate" type="date" required />
          <Input label="Role" name="role" required placeholder="e.g. Software Engineer" />
          {hireError && <p className="text-sm text-red-600">{hireError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setHireOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={hirePending}>
              {hirePending ? "Saving…" : "Confirm hire"}
            </Button>
          </div>
        </form>
      </Modal>

      {user.employee && (
        <Modal
          title={`Edit — ${displayName}`}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          wide
        >
          <form
            className="space-y-4"
            action={(formData) => {
              setEditError(null);
              startEditTransition(async () => {
                const result = await updateEmployee(formData);
                if (result.error) {
                  setEditError(result.error);
                } else {
                  setEditOpen(false);
                }
              });
            }}
          >
            <input type="hidden" name="employeeId" value={user.employee.id} />
            <Select
              label="Company"
              name="company"
              required
              defaultValue={user.employee.company}
              options={COMPANY_OPTIONS}
            />
            <Select
              label="Contract"
              name="contract"
              required
              defaultValue={user.employee.contract}
              options={CONTRACT_OPTIONS}
            />
            <Input
              label="Starting date"
              name="startDate"
              type="date"
              required
              defaultValue={toDateInputValue(user.employee.startDate)}
            />
            <Input
              label="Role"
              name="role"
              required
              defaultValue={user.employee.role}
              placeholder="e.g. Software Engineer"
            />
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editPending}>
                {editPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {user.employee && (
        <Modal
          title={`End contract — ${displayName}`}
          open={endOpen}
          onClose={() => setEndOpen(false)}
        >
          <form
            className="space-y-4"
            action={(formData) => {
              setEndError(null);
              startEndTransition(async () => {
                const result = await endEmployeeContract(formData);
                if (result.error) {
                  setEndError(result.error);
                } else {
                  setEndOpen(false);
                }
              });
            }}
          >
            <input type="hidden" name="employeeId" value={user.employee.id} />
            <Input label="End date" name="endDate" type="date" required />
            <p className="text-xs text-slate-500">
              Past dates mark the employee as a past employee immediately. Future dates keep them
              active until that date.
            </p>
            {endError && <p className="text-sm text-red-600">{endError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEndOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={endPending}>
                {endPending ? "Saving…" : "End contract"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        title={`Attach contract — ${displayName}`}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        wide
      >
        <form
          className="space-y-4"
          encType="multipart/form-data"
          action={(formData) => {
            setUploadError(null);
            startUploadTransition(async () => {
              const result = await uploadEmployeeDocument(formData);
              if (result.error) {
                setUploadError(result.error);
              } else {
                setUploadOpen(false);
              }
            });
          }}
        >
          <input type="hidden" name="employeeId" value={user.employee?.id ?? ""} />
          <div className="text-sm">
            <label htmlFor={`contract-${user.id}`} className="font-medium text-slate-700">
              Contract PDF
            </label>
            <input
              id={`contract-${user.id}`}
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
            <p className="mt-1 text-xs text-slate-500">PDF only, max 10 MB.</p>
          </div>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadPending}>
              {uploadPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function FilterCheckboxGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-100"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function HrFilters({
  userTypes,
  companies,
  contracts,
}: {
  userTypes: string[];
  companies: string[];
  contracts: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const params = new URLSearchParams();

          for (const key of ["userType", "company", "contract"]) {
            const values = formData.getAll(key).map((value) => String(value));
            if (values.length > 0) params.set(key, values.join(","));
          }

          startTransition(() => {
            router.push(params.size ? `/hr?${params.toString()}` : "/hr");
          });
        }}
      >
        <FilterCheckboxGroup
          legend="User type"
          name="userType"
          selected={userTypes}
          options={[
            { value: "user", label: "Users" },
            { value: "employee", label: "Employees" },
            { value: "past_employee", label: "Past employees" },
          ]}
        />
        <FilterCheckboxGroup
          legend="Company"
          name="company"
          selected={companies}
          options={COMPANY_OPTIONS}
        />
        <FilterCheckboxGroup
          legend="Contract"
          name="contract"
          selected={contracts}
          options={CONTRACT_OPTIONS}
        />
        <div className="flex items-end lg:col-span-1">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Filtering…" : "Apply filters"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function HrUserList({ users }: { users: HrUserRow[] }) {
  if (users.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-sm text-slate-500">No users match these filters.</p>
      </Card>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
      <ul className="divide-y divide-slate-100 bg-white">
        {users.map((user) => (
          <HrUserRowItem key={user.id} user={user} />
        ))}
      </ul>
    </div>
  );
}
