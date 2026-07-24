export type LinkedAppKey =
  | "hols"
  | "assembly"
  | "sales"
  | "mrp"
  | "factory"
  | "rp"
  | "clock"
  | "tasks"
  | "zeron"
  | "requests";

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
  sales: {
    key: "sales",
    label: "Sales",
    domain: "sales.meavo.app",
    defaultCardId: "seed-sales-tool",
  },
  mrp: {
    key: "mrp",
    label: "MRP",
    domain: "mrp.meavo.app",
    defaultCardId: "seed-mrp-tool",
  },
  factory: {
    key: "factory",
    label: "Factory",
    domain: "factory.meavo.app",
    defaultCardId: "seed-factory-tool",
  },
  rp: {
    key: "rp",
    label: "RP",
    domain: "rp.meavo.app",
    defaultCardId: "seed-rp-tool",
  },
  clock: {
    key: "clock",
    label: "Clock-In",
    domain: "clock.meavo.app",
    defaultCardId: "seed-clock-tool",
  },
  tasks: {
    key: "tasks",
    label: "Tasks",
    domain: "tasks.meavo.app",
    defaultCardId: "seed-tasks-tool",
  },
  zeron: {
    key: "zeron",
    label: "Zeron Materials",
    domain: "zeron.meavo.app",
    defaultCardId: "seed-zeron-tool",
  },
  requests: {
    key: "requests",
    label: "Requests",
    domain: "requests.meavo.app",
    defaultCardId: "seed-requests-tool",
  },
};

export const LINKED_APP_OPTIONS = Object.values(APP_ACCESS_CARDS).map((app) => ({
  value: app.key,
  label: `${app.label} (${app.domain})`,
}));

export function isLinkedAppKey(value: string | null | undefined): value is LinkedAppKey {
  return (
    value === "hols" ||
    value === "assembly" ||
    value === "sales" ||
    value === "mrp" ||
    value === "factory" ||
    value === "rp" ||
    value === "clock" ||
    value === "tasks" ||
    value === "zeron" ||
    value === "requests"
  );
}

export function getAppAccessDefinition(key: string | null | undefined): AppAccessCardDefinition | null {
  if (!isLinkedAppKey(key)) return null;
  return APP_ACCESS_CARDS[key];
}
