import { ToolCardKind } from "@prisma/client";
import { getAppAccessDefinition } from "@/lib/tool-card-registry";
import { toolCardKindLabel } from "@/lib/tool-card-kind";

export function ToolCardKindBadge({
  kind,
  linkedAppKey,
}: {
  kind: ToolCardKind;
  linkedAppKey: string | null;
}) {
  const app = getAppAccessDefinition(linkedAppKey);

  if (kind === ToolCardKind.APP_ACCESS) {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
        {toolCardKindLabel(kind)}
        {app ? ` · ${app.label}` : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {toolCardKindLabel(kind)}
    </span>
  );
}
