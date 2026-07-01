type SlackWebhookMessage = {
  text: string;
  blocks?: unknown[];
};

export async function postSlackWebhook(
  webhookUrl: string,
  message: SlackWebhookMessage
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Slack webhook failed (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`
    );
  }
}
