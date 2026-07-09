export type IconVariant = "green" | "black" | "gold" | "blue" | "pink";
export type IconSection = "apps" | "general";

export type ToolCardIcon = {
  key: string;
  label: string;
  file: string;
  variant: IconVariant;
  baseKey: string;
  section: IconSection;
};

type BaseIcon = {
  baseKey: string;
  label: string;
  section: IconSection;
};

const VARIANTS: { variant: IconVariant; suffix: string; labelSuffix: string }[] = [
  { variant: "green", suffix: "", labelSuffix: "" },
  { variant: "black", suffix: "--black", labelSuffix: " (Black)" },
  { variant: "gold", suffix: "--gold", labelSuffix: " (Gold)" },
  { variant: "blue", suffix: "--blue", labelSuffix: " (Blue)" },
  { variant: "pink", suffix: "--pink", labelSuffix: " (Pink)" },
];

/** Named icons for apps, modules, and common tool topics. */
const NAMED_ICONS: BaseIcon[] = [
  { baseKey: "clock-in", label: "Clock-In", section: "apps" },
  { baseKey: "tasks", label: "Tasks", section: "apps" },
  { baseKey: "vacation", label: "Vacation", section: "apps" },
  { baseKey: "assembly", label: "Assembly", section: "apps" },
  { baseKey: "sales", label: "Sales", section: "apps" },
  { baseKey: "mrp", label: "MRP", section: "apps" },
  { baseKey: "factory", label: "Factory", section: "apps" },
  { baseKey: "hr", label: "HR", section: "apps" },
  { baseKey: "reports", label: "Reports", section: "apps" },
  { baseKey: "library", label: "Library", section: "apps" },
  { baseKey: "notifications", label: "Notifications", section: "apps" },
  { baseKey: "levelling", label: "Levelling", section: "apps" },
  { baseKey: "handover", label: "Handover", section: "apps" },
  { baseKey: "replacement", label: "Replacement", section: "apps" },
  { baseKey: "door", label: "Door", section: "apps" },
  { baseKey: "cleaning", label: "Cleaning", section: "apps" },
];

/** Generic icons from the MEAVO style guide library. */
const FRAME_ICONS: BaseIcon[] = [
  { baseKey: "frame-1000008429", label: "Icon 1", section: "general" },
  { baseKey: "frame-1000008430", label: "Icon 2", section: "general" },
  { baseKey: "frame-1000008432", label: "Icon 3", section: "general" },
  { baseKey: "frame-1000008969", label: "Icon 4", section: "general" },
  { baseKey: "frame-1000008970", label: "Icon 5", section: "general" },
  { baseKey: "frame-1000008971", label: "Icon 6", section: "general" },
  { baseKey: "frame-1000008972", label: "Icon 7", section: "general" },
  { baseKey: "frame-1000008973", label: "Icon 8", section: "general" },
  { baseKey: "frame-1000008974", label: "Icon 9", section: "general" },
  { baseKey: "frame-1000008975", label: "Icon 10", section: "general" },
  { baseKey: "frame-1000008976", label: "Icon 11", section: "general" },
  { baseKey: "frame-1000008977", label: "Icon 12", section: "general" },
  { baseKey: "frame-1000008978", label: "Icon 13", section: "general" },
  { baseKey: "frame-1000008979", label: "Icon 14", section: "general" },
  { baseKey: "frame-1000008980", label: "Icon 15", section: "general" },
  { baseKey: "frame-1000008981", label: "Icon 16", section: "general" },
  { baseKey: "frame-1000008982", label: "Icon 17", section: "general" },
  { baseKey: "frame-1000008983", label: "Icon 18", section: "general" },
  { baseKey: "frame-1000008984", label: "Icon 19", section: "general" },
  { baseKey: "frame-1000008985", label: "Icon 20", section: "general" },
];

function buildToolCardIcons(bases: BaseIcon[]): ToolCardIcon[] {
  const icons: ToolCardIcon[] = [];
  for (const base of bases) {
    for (const { variant, suffix, labelSuffix } of VARIANTS) {
      icons.push({
        key: `${base.baseKey}${suffix}`,
        label: `${base.label}${labelSuffix}`,
        file: `/icons/tool-cards/${base.baseKey}${suffix}.svg`,
        variant,
        baseKey: base.baseKey,
        section: base.section,
      });
    }
  }
  return icons;
}

/** MEAVO style guide icon library — bundled from Google Drive plus custom tool icons. */
export const TOOL_CARD_ICONS: ToolCardIcon[] = [
  ...buildToolCardIcons(NAMED_ICONS),
  ...buildToolCardIcons(FRAME_ICONS),
];

export const ICON_VARIANTS: { key: IconVariant; label: string }[] = [
  { key: "green", label: "Green" },
  { key: "black", label: "Black" },
  { key: "gold", label: "Gold" },
  { key: "blue", label: "Blue" },
  { key: "pink", label: "Pink" },
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
