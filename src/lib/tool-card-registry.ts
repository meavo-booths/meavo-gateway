export type LinkedAppKey = "hols" | "assembly";

export type AppAccessCardDefinition = {
  key: LinkedAppKey;
  label: string;
  domain: string;
  defaultCardId: string;
};

/** Known Meavo apps whose login is gated by a tool card ID. */
export const APP_ACCESS_CARDS: Record<LinkedAppKey, AppAccessCardDefinition> = {
  hols: {
    key: "hols",
    label: "Vacation Tracker",
    domain: "hols.meavo.app",
    defaultCardId: "seed-vacation-tracker",
  },
  assembly: {
    key: "assembly",
    label: "Assembly",
    domain: "assembly.meavo.app",
    defaultCardId: "seed-assembly-tool",
  },
};

export const LINKED_APP_OPTIONS = Object.values(APP_ACCESS_CARDS).map((app) => ({
  value: app.key,
  label: `${app.label} (${app.domain})`,
}));

export function isLinkedAppKey(value: string | null | undefined): value is LinkedAppKey {
  return value === "hols" || value === "assembly";
}

export function getAppAccessDefinition(key: string | null | undefined): AppAccessCardDefinition | null {
  if (!isLinkedAppKey(key)) return null;
  return APP_ACCESS_CARDS[key];
}
