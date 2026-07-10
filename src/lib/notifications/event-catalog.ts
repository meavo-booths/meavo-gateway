export type NotificationEventDefinition = {
  eventType: string;
  sourceApp: string;
  label: string;
  description: string;
  trigger: string;
};

export const NOTIFICATION_EVENT_CATALOG: NotificationEventDefinition[] = [
  {
    eventType: "hols.vacation.requested",
    sourceApp: "hols",
    label: "Vacation requested",
    description: "Notify team managers when an employee submits leave.",
    trigger: "New vacation request (hols)",
  },
  {
    eventType: "hols.vacation.approved",
    sourceApp: "hols",
    label: "Vacation approved",
    description: "Notify the employee when their leave is approved.",
    trigger: "Manager approves request (hols)",
  },
  {
    eventType: "hols.vacation.rejected",
    sourceApp: "hols",
    label: "Vacation rejected",
    description: "Notify the employee when their leave is rejected.",
    trigger: "Manager rejects request (hols)",
  },
  {
    eventType: "assembly.questionnaire.submitted",
    sourceApp: "assembly",
    label: "Questionnaire submitted",
    description: "Notify assembly operators when a partner submits a questionnaire.",
    trigger: "Partner submits questionnaire (assembly)",
  },
  {
    eventType: "gateway.user.created",
    sourceApp: "gateway",
    label: "User created",
    description: "Welcome email when an admin creates a new user account.",
    trigger: "Admin creates user (gateway)",
  },
  {
    eventType: "gateway.employee.hired",
    sourceApp: "gateway",
    label: "Employee hired",
    description: "Notify the employee and HR when someone is hired.",
    trigger: "HR hires employee (gateway)",
  },
  {
    eventType: "gateway.employee.contract_ended",
    sourceApp: "gateway",
    label: "Contract ended",
    description: "Notify HR when an employee contract ends.",
    trigger: "HR ends contract (gateway)",
  },
  {
    eventType: "tasks.task.assigned",
    sourceApp: "tasks",
    label: "Task assigned",
    description: "Notify a person when a task is assigned to them.",
    trigger: "Task assigned to a user (tasks)",
  },
  {
    eventType: "tasks.digest.daily",
    sourceApp: "tasks",
    label: "Daily task digest",
    description: "Morning summary of overdue and due-today tasks, per person.",
    trigger: "Weekday morning cron (gateway)",
  },
  {
    eventType: "sales.deal.vip_won",
    sourceApp: "sales",
    label: "VIP deal won",
    description: "Notify the sales team when a deal for a VIP client is won.",
    trigger: "Quote converted to won VIP deal (sales)",
  },
];

export const NOTIFICATION_EVENT_TYPES = NOTIFICATION_EVENT_CATALOG.map((event) => event.eventType);
