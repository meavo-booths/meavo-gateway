export type NotificationRecipient = {
  email: string;
  userId?: string;
  name?: string | null;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type RenderedInApp = {
  title: string;
  body: string;
  url?: string;
};

export type EnqueueNotificationInput = {
  sourceApp: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};
