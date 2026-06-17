import { HR_DATABASE_SECTIONS } from "@/lib/hr-database-fields";
import { Card } from "@/components/ui";

export function HrDatabaseReference() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Database fields</h2>
        <p className="mt-1 text-sm text-slate-500">
          Reference for contract templates and document generation. String fields default to empty
          unless noted.
        </p>
      </div>

      {HR_DATABASE_SECTIONS.map((section) => (
        <Card key={section.title}>
          <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Table: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{section.table}</code>
            {" · "}
            {section.description}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="pb-2 pr-4 font-medium">DB field</th>
                  <th className="pb-2 pr-4 font-medium">UI label</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {section.fields.map((field) => (
                  <tr key={field.name}>
                    <td className="py-2.5 pr-4 font-mono text-xs text-brand-700">{field.name}</td>
                    <td className="py-2.5 pr-4 text-slate-900">{field.label}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{field.type}</td>
                    <td className="py-2.5 text-slate-500">{field.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
