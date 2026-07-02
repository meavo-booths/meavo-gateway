"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteEmployeeDocument,
  endEmployeeContract,
  hireEmployee,
  updateEmployee,
  updateEmployeeSalary,
  uploadEmployeeDocument,
} from "@/app/actions/hr";
import { HR_COMPANY_OPTIONS, HR_CONTRACT_OPTIONS } from "@/components/hr-filters";
import {
  contractLabel,
  employeeTypeLabel,
  isActiveEmployee,
} from "@/lib/hr-employee";
import { formatSalaryEur } from "@/lib/salary";
import { Button, Card, Input, Select } from "@/components/ui";

type HrDocument = {
  id: string;
  fileName: string;
  createdAt: string;
};

type HrSalaryHistoryRow = {
  id: string;
  yearlySalary: string;
  effectiveFrom: string;
  note: string;
  changedByLabel: string;
};

type HrEmployee = {
  id: string;
  company: "MEAVO" | "OA";
  contract: "FTE" | "FREELANCE";
  startDate: string;
  endDate: string | null;
  role: string;
  yearlySalary: string | null;
  salaryHistory: HrSalaryHistoryRow[];
  documents: HrDocument[];
};

export type HrUserRow = {
  id: string;
  name: string | null;
  email: string;
  teamName: string | null;
  employee: HrEmployee | null;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-h-[85vh] rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6 ${wide ? "max-w-2xl" : "max-w-sm"} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4 max-h-[calc(85vh-7rem)] overflow-y-auto overscroll-contain pr-1">
          {children}
        </div>
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
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hirePending, startHireTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  const [salaryPending, startSalaryTransition] = useTransition();
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
          <Select label="Company" name="company" required options={HR_COMPANY_OPTIONS} />
          <Select label="Contract" name="contract" required options={HR_CONTRACT_OPTIONS} />
          <Input label="Starting date" name="startDate" type="date" required />
          <Input label="Role" name="role" required placeholder="e.g. Software Engineer" />
          <Input
            label="Yearly salary (EUR)"
            name="yearlySalary"
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="e.g. 36000"
          />
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
          <div className="space-y-6">
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
                options={HR_COMPANY_OPTIONS}
              />
              <Select
                label="Contract"
                name="contract"
                required
                defaultValue={user.employee.contract}
                options={HR_CONTRACT_OPTIONS}
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
                  {editPending ? "Saving…" : "Save contract details"}
                </Button>
              </div>
            </form>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-sm font-semibold text-slate-900">Salary</h4>
              <p className="mt-1 text-sm text-slate-500">
                Current yearly salary:{" "}
                <span className="font-medium text-slate-700">
                  {formatSalaryEur(user.employee.yearlySalary)}
                </span>
              </p>
              <form
                className="mt-4 space-y-4"
                action={(formData) => {
                  setSalaryError(null);
                  startSalaryTransition(async () => {
                    const result = await updateEmployeeSalary(formData);
                    if (result.error) {
                      setSalaryError(result.error);
                    } else {
                      setEditOpen(false);
                    }
                  });
                }}
              >
                <input type="hidden" name="employeeId" value={user.employee.id} />
                <Input
                  label="Yearly salary (EUR)"
                  name="yearlySalary"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  defaultValue={user.employee.yearlySalary ?? ""}
                />
                <Input
                  label="Effective from"
                  name="effectiveFrom"
                  type="date"
                  required
                  defaultValue={todayInputValue()}
                />
                <Input
                  label="Note (optional)"
                  name="salaryNote"
                  placeholder="Reason for change"
                />
                {salaryError && <p className="text-sm text-red-600">{salaryError}</p>}
                <div className="flex justify-end">
                  <Button type="submit" disabled={salaryPending}>
                    {salaryPending ? "Saving…" : "Update salary"}
                  </Button>
                </div>
              </form>

              {user.employee.salaryHistory.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-4 font-medium">Effective from</th>
                        <th className="py-2 pr-4 font-medium">Yearly</th>
                        <th className="py-2 pr-4 font-medium">Changed by</th>
                        <th className="py-2 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.employee.salaryHistory.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-700">
                            {formatDate(entry.effectiveFrom)}
                          </td>
                          <td className="py-2 pr-4 text-slate-700">
                            {formatSalaryEur(entry.yearlySalary)}
                          </td>
                          <td className="py-2 pr-4 text-slate-600">{entry.changedByLabel}</td>
                          <td className="py-2 text-slate-600">{entry.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
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
