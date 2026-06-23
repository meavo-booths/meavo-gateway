export type ToolCardIcon = {
  key: string;
  label: string;
  file: string;
};

/** MEAVO style guide icon library — bundled from Google Drive. */
export const TOOL_CARD_ICONS: ToolCardIcon[] = [
  { key: "frame-1000008429", label: "Icon 1", file: "/icons/tool-cards/frame-1000008429.svg" },
  { key: "frame-1000008430", label: "Icon 2", file: "/icons/tool-cards/frame-1000008430.svg" },
  { key: "frame-1000008432", label: "Icon 3", file: "/icons/tool-cards/frame-1000008432.svg" },
  { key: "frame-1000008969", label: "Icon 4", file: "/icons/tool-cards/frame-1000008969.svg" },
  { key: "frame-1000008970", label: "Icon 5", file: "/icons/tool-cards/frame-1000008970.svg" },
  { key: "frame-1000008971", label: "Icon 6", file: "/icons/tool-cards/frame-1000008971.svg" },
  { key: "frame-1000008972", label: "Icon 7", file: "/icons/tool-cards/frame-1000008972.svg" },
  { key: "frame-1000008973", label: "Icon 8", file: "/icons/tool-cards/frame-1000008973.svg" },
  { key: "frame-1000008974", label: "Icon 9", file: "/icons/tool-cards/frame-1000008974.svg" },
  { key: "frame-1000008975", label: "Icon 10", file: "/icons/tool-cards/frame-1000008975.svg" },
  { key: "frame-1000008976", label: "Icon 11", file: "/icons/tool-cards/frame-1000008976.svg" },
  { key: "frame-1000008977", label: "Icon 12", file: "/icons/tool-cards/frame-1000008977.svg" },
  { key: "frame-1000008978", label: "Icon 13", file: "/icons/tool-cards/frame-1000008978.svg" },
  { key: "frame-1000008979", label: "Icon 14", file: "/icons/tool-cards/frame-1000008979.svg" },
  { key: "frame-1000008980", label: "Icon 15", file: "/icons/tool-cards/frame-1000008980.svg" },
  { key: "frame-1000008981", label: "Icon 16", file: "/icons/tool-cards/frame-1000008981.svg" },
  { key: "frame-1000008982", label: "Icon 17", file: "/icons/tool-cards/frame-1000008982.svg" },
  { key: "frame-1000008983", label: "Icon 18", file: "/icons/tool-cards/frame-1000008983.svg" },
  { key: "frame-1000008984", label: "Icon 19", file: "/icons/tool-cards/frame-1000008984.svg" },
  { key: "frame-1000008985", label: "Icon 20", file: "/icons/tool-cards/frame-1000008985.svg" },
];

export function isValidIconKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return TOOL_CARD_ICONS.some((icon) => icon.key === key);
}

export function getToolCardIcon(key: string | null | undefined): ToolCardIcon | null {
  if (!key) return null;
  return TOOL_CARD_ICONS.find((icon) => icon.key === key) ?? null;
}

export function parseIconKey(formData: FormData): string | null {
  const raw = (formData.get("iconKey") as string | null)?.trim();
  return raw && isValidIconKey(raw) ? raw : null;
}
