import { google } from "googleapis";

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

export function parseServiceAccountJson(): ServiceAccountCredentials | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;

  const credentials = JSON.parse(json) as ServiceAccountCredentials;
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }

  return credentials;
}

export function getServiceAccountEmail(): string | null {
  try {
    return parseServiceAccountJson()?.client_email ?? null;
  } catch {
    return null;
  }
}

async function getSheetsClient() {
  const credentials = parseServiceAccountJson();
  if (!credentials) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function getSheetValues(
  spreadsheetId: string,
  tabName: string
): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!A:AB`,
  });

  return (response.data.values ?? []) as string[][];
}
