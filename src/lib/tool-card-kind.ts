import { ToolCardKind } from "@prisma/client";
import { getAppAccessDefinition, isLinkedAppKey } from "@/lib/tool-card-registry";

export type ToolCardKindFields = {
  kind: ToolCardKind;
  linkedAppKey: string | null;
};

export function parseToolCardKindFields(formData: FormData): ToolCardKindFields | null {
  const kindRaw = formData.get("kind") as string;
  const kind = kindRaw === "APP_ACCESS" ? ToolCardKind.APP_ACCESS : ToolCardKind.LINK;

  if (kind === ToolCardKind.LINK) {
    return { kind, linkedAppKey: null };
  }

  const linkedAppKey = (formData.get("linkedAppKey") as string | null)?.trim() ?? "";
  if (!isLinkedAppKey(linkedAppKey)) return null;

  return { kind, linkedAppKey };
}

export function toolCardKindLabel(kind: ToolCardKind): string {
  return kind === ToolCardKind.APP_ACCESS ? "App access" : "Link only";
}

export function toolCardAccessDescription(
  kind: ToolCardKind,
  linkedAppKey: string | null,
): string {
  if (kind === ToolCardKind.APP_ACCESS) {
    const app = getAppAccessDefinition(linkedAppKey);
    if (app) {
      return `Controls dashboard visibility and sign-in to ${app.label} (${app.domain}).`;
    }
    return "Controls dashboard visibility and sign-in to a Meavo app.";
  }

  return "Controls who sees this tile on the dashboard only. Does not control app login.";
}

export function toolCardDeleteWarning(
  name: string,
  kind: ToolCardKind,
  linkedAppKey: string | null,
  accessUserCount: number,
): string {
  if (kind !== ToolCardKind.APP_ACCESS) {
    return `Delete "${name}"?`;
  }

  const app = getAppAccessDefinition(linkedAppKey);
  const appLabel = app ? `${app.label} (${app.domain})` : "the linked app";
  const users =
    accessUserCount === 1 ? "1 user" : `${accessUserCount} users`;

  return `Delete "${name}"? This will revoke sign-in access to ${appLabel} for ${users}.`;
}
