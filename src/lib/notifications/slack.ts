import { prisma } from "@/lib/prisma";
import type { NotificationRecipient } from "@/lib/notifications/types";

const SLACK_API = "https://slack.com/api";

type SlackApiResponse = {
  ok: boolean;
  error?: string;
  user?: { id: string };
  ts?: string;
};

function getBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN?.trim() || null;
}

async function slackApi(
  token: string,
  method: string,
  body: Record<string, unknown>,
  // users.lookupByEmail (and other GET-style methods) reject JSON bodies
  // with invalid_arguments; they require form-encoded arguments.
  encoding: "json" | "form" = "json",
): Promise<SlackApiResponse> {
  const response = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type":
        encoding === "json"
          ? "application/json; charset=utf-8"
          : "application/x-www-form-urlencoded; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body:
      encoding === "json"
        ? JSON.stringify(body)
        : new URLSearchParams(
            Object.fromEntries(
              Object.entries(body).map(([key, value]) => [key, String(value)]),
            ),
          ).toString(),
  });
  if (!response.ok) {
    throw new Error(`Slack API ${method} failed with HTTP ${response.status}`);
  }
  const data = (await response.json()) as SlackApiResponse;
  if (!data.ok) {
    throw new Error(`Slack API ${method} failed: ${data.error ?? "unknown_error"}`);
  }
  return data;
}

/**
 * Resolves the Slack member ID for a recipient, caching it on User.slackUserId
 * so we only hit users.lookupByEmail once per user.
 */
async function resolveSlackUserId(
  token: string,
  recipient: NotificationRecipient,
): Promise<string> {
  if (recipient.userId) {
    const user = await prisma.user.findUnique({
      where: { id: recipient.userId },
      select: { slackUserId: true },
    });
    if (user?.slackUserId) return user.slackUserId;
  }

  const lookup = await slackApi(token, "users.lookupByEmail", { email: recipient.email }, "form");
  const slackUserId = lookup.user?.id;
  if (!slackUserId) {
    throw new Error(`No Slack user found for ${recipient.email}`);
  }

  if (recipient.userId) {
    await prisma.user
      .update({ where: { id: recipient.userId }, data: { slackUserId } })
      .catch(() => undefined);
  }
  return slackUserId;
}

/**
 * Sends a Slack DM to the recipient via the workspace bot. Requires a Slack
 * app installed with chat:write, im:write and users:read.email scopes and
 * SLACK_BOT_TOKEN set. Returns the message timestamp. Throws when the bot is
 * not configured so the delivery is recorded as FAILED rather than SENT.
 */
export async function sendSlackDm(
  recipient: NotificationRecipient,
  text: string,
): Promise<string> {
  const token = getBotToken();
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured; Slack DM not sent");
  }

  const slackUserId = await resolveSlackUserId(token, recipient);
  const result = await slackApi(token, "chat.postMessage", {
    channel: slackUserId,
    text,
    unfurl_links: false,
    unfurl_media: false,
  });
  return result.ts ?? "sent";
}
