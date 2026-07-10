"use client";

import {
  endEmployeeContract,
  hireEmployee,
  updateEmployee,
  updateEmployeeSalary,
  uploadEmployeeDocument,
} from "@/app/actions/hr";
import { FormModal } from "@/components/form-modal";
import { HR_COMPANY_OPTIONS, HR_CONTRACT_OPTIONS } from "@/components/hr-filters";
import { Modal } from "@/components/modal";
import { Button, Input, Select } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import { formatSalaryEur } from "@/lib/salary";

export type HrSalaryHistoryRow = {
  id: string;
  yearlySalary: string;
  effectiveFrom: string;
  note: string;
  changedByLabel: string;
};

export type HrEmployee = {
  id: string;
  company: "MEAVO" | "OA";
  contract: "FTE" | "FREELANCE";
  startDate: string;
  endDate: string | null;
  role: string;
  yearlySalary: string | null;
  salaryHistory: HrSalaryHistoryRow[];
  documents: { id: string; fileName: string; createdAt: string }[];
};

const WIDE_MODAL = "max-w-2xl";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function HireEmployeeModal({
  userId,
  displayName,
  open,
  onClose,
}: {
  userId: string;
  displayName: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <FormModal
      title={`Hire — ${displayName}`}
      open={open}
      onClose={onClose}
      action={hireEmployee}
      submitLabel="Confirm hire"
      maxWidthClassName={WIDE_MODAL}
    >
      <input type="hidden" name="userId" value={userId} />
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
    </FormModal>
  );
}

export function EndContractModal({
  employeeId,
  displayName,
  open,
  onClose,
}: {
  employeeId: string;
  displayName: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <FormModal
      title={`End contract — ${displayName}`}
      open={open}
      onClose={onClose}
      action={endEmployeeContract}
      submitLabel="End contract"
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <Input label="End date" name="endDate" type="date" required />
      <p className="text-xs text-slate-500">
        Past dates mark the employee as a past employee immediately. Future dates keep them
        active until that date.
      </p>
    </FormModal>
  );
}

export function UploadDocumentModal({
  employeeId,
  userId,
  displayName,
  open,
  onClose,
}: {
  employeeId: string;
  userId: string;
  displayName: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <FormModal
      title={`Attach contract — ${displayName}`}
      open={open}
      onClose={onClose}
      action={uploadEmployeeDocument}
      submitLabel="Upload"
      pendingLabel="Uploading…"
      maxWidthClassName={WIDE_MODAL}
      encType="multipart/form-data"
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="text-sm">
        <label htmlFor={`contract-${userId}`} className="font-medium text-slate-700">
          Contract PDF
        </label>
        <input
          id={`contract-${userId}`}
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-500">PDF only, max 10 MB.</p>
      </div>
    </FormModal>
  );
}

/** Contract details and salary are two independent forms in one modal. */
export function EditEmployeeModal({
  employee,
  displayName,
  open,
  onClose,
}: {
  employee: HrEmployee;
  displayName: string;
  open: boolean;
  onClose: () => void;
}) {
  const contractForm = useFormAction(updateEmployee, { onSuccess: onClose });
  const salaryForm = useFormAction(updateEmployeeSalary, { onSuccess: onClose });

  return (
    <Modal
      title={`Edit — ${displayName}`}
      open={open}
      onClose={onClose}
      maxWidthClassName={WIDE_MODAL}
      panelClassName="max-h-[85vh] overflow-hidden p-4 sm:p-6"
      bodyClassName="mt-4 max-h-[calc(85vh-7rem)] overflow-y-auto overscroll-contain pr-1"
    >
      <div className="space-y-6">
        <form className="space-y-4" action={contractForm.submit}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <Select
            label="Company"
            name="company"
            required
            defaultValue={employee.company}
            options={HR_COMPANY_OPTIONS}
          />
          <Select
            label="Contract"
            name="contract"
            required
            defaultValue={employee.contract}
            options={HR_CONTRACT_OPTIONS}
          />
          <Input
            label="Starting date"
            name="startDate"
            type="date"
            required
            defaultValue={toDateInputValue(employee.startDate)}
          />
          <Input
            label="Role"
            name="role"
            required
            defaultValue={employee.role}
            placeholder="e.g. Software Engineer"
          />
          {contractForm.error && <p className="text-sm text-red-600">{contractForm.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={contractForm.pending}>
              {contractForm.pending ? "Saving…" : "Save contract details"}
            </Button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-6">
          <h4 className="text-sm font-semibold text-slate-900">Salary</h4>
          <p className="mt-1 text-sm text-slate-500">
            Current yearly salary:{" "}
            <span className="font-medium text-slate-700">
              {formatSalaryEur(employee.yearlySalary)}
            </span>
          </p>
          <form className="mt-4 space-y-4" action={salaryForm.submit}>
            <input type="hidden" name="employeeId" value={employee.id} />
            <Input
              label="Yearly salary (EUR)"
              name="yearlySalary"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={employee.yearlySalary ?? ""}
            />
            <Input
              label="Effective from"
              name="effectiveFrom"
              type="date"
              required
              defaultValue={todayInputValue()}
            />
            <Input label="Note (optional)" name="salaryNote" placeholder="Reason for change" />
            {salaryForm.error && <p className="text-sm text-red-600">{salaryForm.error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={salaryForm.pending}>
                {salaryForm.pending ? "Saving…" : "Update salary"}
              </Button>
            </div>
          </form>

          {employee.salaryHistory.length > 0 ? (
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
                  {employee.salaryHistory.map((entry) => (
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
  );
}
