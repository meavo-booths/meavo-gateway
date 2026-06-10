"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteEmployeeDocument,
  hireEmployee,
  uploadEmployeeDocument,
} from "@/app/actions/hr";
import { Button, Card, Input, Select } from "@/components/ui";

type HrDocument = {
  id: string;
  fileName: string;
  createdAt: string;
};

type HrEmployee = {
  id: string;
  company: "MEAVO" | "OA";
  contract: "FTE" | "FREELANCE";
  startDate: string;
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

function contractLabel(contract: "FTE" | "FREELANCE") {
  return contract === "FTE" ? "FTE" : "Freelance";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HrUserRowItem({ user }: { user: HrUserRow }) {
  const displayName = user.name ?? user.email;
  const [hireOpen, setHireOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hirePending, startHireTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  return (
    <>
      <li className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-slate-900">{displayName}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                user.employee
                  ? "bg-brand-50 text-brand-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {user.employee ? "Employee" : "User"}
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
            <Button type="button" variant="secondary" onClick={() => setUploadOpen(true)}>
              Attach contract
            </Button>
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
          <Select
            label="Company"
            name="company"
            required
            options={[
              { value: "MEAVO", label: "MEAVO" },
              { value: "OA", label: "OA" },
            ]}
          />
          <Select
            label="Contract"
            name="contract"
            required
            options={[
              { value: "FTE", label: "FTE" },
              { value: "FREELANCE", label: "Freelance" },
            ]}
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

export function HrFilters({
  userType,
  company,
  contract,
}: {
  userType: string;
  company: string;
  contract: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const params = new URLSearchParams();
          for (const key of ["userType", "company", "contract"]) {
            const value = formData.get(key)?.toString();
            if (value && value !== "all") params.set(key, value);
          }
          startTransition(() => {
            router.push(params.size ? `/hr?${params.toString()}` : "/hr");
          });
        }}
      >
        <Select
          label="User type"
          name="userType"
          defaultValue={userType}
          options={[
            { value: "all", label: "All" },
            { value: "user", label: "Users only" },
            { value: "employee", label: "Employees only" },
          ]}
        />
        <Select
          label="Company"
          name="company"
          defaultValue={company}
          options={[
            { value: "all", label: "All" },
            { value: "MEAVO", label: "MEAVO" },
            { value: "OA", label: "OA" },
          ]}
        />
        <Select
          label="Contract"
          name="contract"
          defaultValue={contract}
          options={[
            { value: "all", label: "All" },
            { value: "FTE", label: "FTE" },
            { value: "FREELANCE", label: "Freelance" },
          ]}
        />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Filtering…" : "Apply filters"}
        </Button>
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
