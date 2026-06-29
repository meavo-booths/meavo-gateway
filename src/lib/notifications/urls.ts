function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function gatewayUrl(): string {
  if (process.env.AUTH_URL) return trimTrailingSlash(process.env.AUTH_URL);
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function holsUrl(): string {
  return trimTrailingSlash(process.env.HOLS_URL ?? "https://hols.meavo.app");
}

export function assemblyUrl(): string {
  return trimTrailingSlash(process.env.ASSEMBLY_URL ?? "https://assembly.meavo.app");
}
