export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #0f172a;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #64748b;">MEAVO internal notification</p>
  </div>
</body>
</html>`;
}

export function buttonLink(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<p style="margin: 24px 0;">
    <a href="${safeHref}" style="display: inline-block; background: #7c2d12; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">${safeLabel}</a>
  </p>`;
}
