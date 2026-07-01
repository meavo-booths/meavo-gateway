import { Fragment } from "react";
import { Card } from "@/components/ui";
import { contractLabel } from "@/lib/hr-employee";
import { formatSalaryEur, monthlyFromYearly } from "@/lib/salary";

export type SalaryReportRow = {
  id: string;
  name: string;
  teamKey: string;
  teamName: string;
  contract: "FTE" | "FREELANCE";
  currentYearly: string | null;
  compareYearly: string | null;
};

type TeamTotal = {
  teamKey: string;
  teamName: string;
  currentMonthlyTotal: number;
  compareMonthlyTotal: number;
};

function buildTeamTotals(rows: SalaryReportRow[]): TeamTotal[] {
  const map = new Map<string, TeamTotal>();

  for (const row of rows) {
    const currentMonthly = row.currentYearly ? monthlyFromYearly(row.currentYearly) : 0;
    const compareMonthly = row.compareYearly ? monthlyFromYearly(row.compareYearly) : 0;
    const existing = map.get(row.teamKey);
    if (existing) {
      existing.currentMonthlyTotal += currentMonthly;
      existing.compareMonthlyTotal += compareMonthly;
    } else {
      map.set(row.teamKey, {
        teamKey: row.teamKey,
        teamName: row.teamName,
        currentMonthlyTotal: currentMonthly,
        compareMonthlyTotal: compareMonthly,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export function HrSalariesReport({
  rows,
  currentMonthLabel,
  compareMonthLabel,
}: {
  rows: SalaryReportRow[];
  currentMonthLabel: string;
  compareMonthLabel: string;
}) {
  const grouped = new Map<string, SalaryReportRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.teamKey) ?? [];
    group.push(row);
    grouped.set(row.teamKey, group);
  }

  const teamOrder = [...grouped.keys()].sort((a, b) => {
    const nameA = grouped.get(a)?.[0]?.teamName ?? "";
    const nameB = grouped.get(b)?.[0]?.teamName ?? "";
    return nameA.localeCompare(nameB);
  });

  const teamTotals = buildTeamTotals(rows);
  const grandCurrent = teamTotals.reduce((sum, team) => sum + team.currentMonthlyTotal, 0);
  const grandCompare = teamTotals.reduce((sum, team) => sum + team.compareMonthlyTotal, 0);

  if (rows.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-sm text-slate-500">No employees match these filters.</p>
      </Card>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr className="text-slate-600">
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium">Contract</th>
            <th className="px-4 py-3 font-medium text-right">Yearly ({currentMonthLabel})</th>
            <th className="px-4 py-3 font-medium text-right">Monthly ({currentMonthLabel})</th>
            <th className="px-4 py-3 font-medium text-right">Yearly ({compareMonthLabel})</th>
            <th className="px-4 py-3 font-medium text-right">Monthly ({compareMonthLabel})</th>
          </tr>
        </thead>
        <tbody>
          {teamOrder.map((teamKey) => {
            const teamRows = grouped.get(teamKey) ?? [];
            const teamTotal = teamTotals.find((team) => team.teamKey === teamKey);
            return (
              <Fragment key={teamKey}>
                {teamRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.teamName}</td>
                    <td className="px-4 py-3 text-slate-600">{contractLabel(row.contract)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatSalaryEur(row.currentYearly)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {row.currentYearly ? formatSalaryEur(monthlyFromYearly(row.currentYearly)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatSalaryEur(row.compareYearly)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {row.compareYearly ? formatSalaryEur(monthlyFromYearly(row.compareYearly)) : "—"}
                    </td>
                  </tr>
                ))}
                {teamTotal ? (
                  <tr key={`${teamKey}-total`} className="border-b border-slate-200 bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900" colSpan={3}>
                      {teamTotal.teamName} total (monthly)
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatSalaryEur(teamTotal.currentMonthlyTotal)}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatSalaryEur(teamTotal.compareMonthlyTotal)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          <tr className="bg-brand-50/60">
            <td className="px-4 py-3 font-semibold text-slate-900" colSpan={3}>
              Overall total (monthly)
            </td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-right font-semibold text-brand-800">
              {formatSalaryEur(grandCurrent)}
            </td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-right font-semibold text-brand-800">
              {formatSalaryEur(grandCompare)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
