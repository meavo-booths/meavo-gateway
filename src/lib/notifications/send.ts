import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmail(input: SendEmailInput): Promise<string> {
  const override = process.env.EMAIL_DEV_OVERRIDE?.trim();
  const to = override || input.to;
  const subject = override ? `[DEV → ${input.to}] ${input.subject}` : input.subject;
  const from = process.env.EMAIL_FROM?.trim() || "MEAVO <notifications@meavo.app>";

  const resend = getResend();
  if (!resend) {
    // Throw so the delivery is recorded as FAILED and retried, instead of
    // silently marking a never-sent email as SENT.
    throw new Error("RESEND_API_KEY is not configured; email not sent");
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? "sent";
}
