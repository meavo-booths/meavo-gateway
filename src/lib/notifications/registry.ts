import { prisma } from "@/lib/prisma";
import {
  assemblyOperators,
  hrUsers,
  teamManagersForUser,
  userById,
} from "@/lib/notifications/recipients";
import type {
  NotificationRecipient,
  RenderedEmail,
  RenderedInApp,
} from "@/lib/notifications/types";
import { assemblyUrl, gatewayUrl, holsUrl } from "@/lib/notifications/urls";
import { buttonLink, emailLayout, escapeHtml } from "@/lib/notifications/templates/layout";

export type NotificationEventHandler = {
  resolveRecipients: (payload: Record<string, unknown>) => Promise<NotificationRecipient[]>;
  render: (
    payload: Record<string, unknown>,
    recipient: NotificationRecipient,
  ) => Promise<RenderedEmail>;
  /** Short content for the in-app bell; also the default source for Slack DMs. */
  renderInApp: (
    payload: Record<string, unknown>,
    recipient: NotificationRecipient,
  ) => Promise<RenderedInApp>;
  /** Optional Slack-specific text; defaults to renderInApp content. */
  renderSlack?: (
    payload: Record<string, unknown>,
    recipient: NotificationRecipient,
  ) => Promise<string>;
};

/** Slack mrkdwn text derived from the in-app rendering. */
export function slackTextFromInApp(rendered: RenderedInApp): string {
  const lines = [`*${rendered.title}*`, rendered.body];
  if (rendered.url) lines.push(`<${rendered.url}|Open in MEAVO>`);
  return lines.join("\n");
}

function displayName(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(start);
  const endLabel = formatDate(end);
  return startLabel === endLabel ? endLabel : `${startLabel} – ${endLabel}`;
}

function requireString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing payload field: ${key}`);
  }
  return value;
}

async function loadVacationRequest(requestId: string) {
  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          teamMembers: {
            orderBy: { createdAt: "asc" },
            take: 1,
            include: { team: { select: { name: true } } },
          },
        },
      },
      reviewedBy: { select: { name: true, email: true } },
    },
  });
  if (!request) throw new Error("Vacation request not found");
  return request;
}

export const NOTIFICATION_EVENTS: Record<string, NotificationEventHandler> = {
  "hols.vacation.requested": {
    async resolveRecipients(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      return teamManagersForUser(request.userId);
    },
    async render(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const employee = displayName(request.user.name, request.user.email);
      const team = request.user.teamMembers[0]?.team.name ?? "No team";
      const dates = formatDateRange(request.startDate, request.endDate);
      const days = request.days === 1 ? "1 day" : `${request.days} days`;
      const note = request.note?.trim();
      const subject = `Vacation request from ${employee}`;
      const text = [
        `${employee} requested vacation.`,
        `Team: ${team}`,
        `Dates: ${dates}`,
        `Duration: ${days}`,
        note ? `Note: ${note}` : null,
        `Review: ${holsUrl()}/approvals`,
      ]
        .filter(Boolean)
        .join("\n");
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">New vacation request</h1>
        <p><strong>Employee:</strong> ${escapeHtml(employee)}</p>
        <p><strong>Team:</strong> ${escapeHtml(team)}</p>
        <p><strong>Dates:</strong> ${escapeHtml(dates)}</p>
        <p><strong>Duration:</strong> ${escapeHtml(days)}</p>
        ${note ? `<p><strong>Note:</strong><br>${escapeHtml(note)}</p>` : ""}
        ${buttonLink(`${holsUrl()}/approvals`, "Review in Hols")}
      `);
      return { subject, html, text };
    },
    async renderInApp(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const employee = displayName(request.user.name, request.user.email);
      const dates = formatDateRange(request.startDate, request.endDate);
      const days = request.days === 1 ? "1 day" : `${request.days} days`;
      return {
        title: "New vacation request",
        body: `${employee} requested ${dates} (${days}).`,
        url: `${holsUrl()}/approvals`,
      };
    },
  },

  "hols.vacation.approved": {
    async resolveRecipients(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const recipient = await userById(request.userId);
      return recipient ? [recipient] : [];
    },
    async render(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const reviewer = displayName(request.reviewedBy?.name, request.reviewedBy?.email ?? "Manager");
      const dates = formatDateRange(request.startDate, request.endDate);
      const subject = "Your vacation request was approved";
      const text = `Your vacation (${dates}) was approved by ${reviewer}.`;
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">Vacation approved</h1>
        <p>Your vacation request for <strong>${escapeHtml(dates)}</strong> was approved by ${escapeHtml(reviewer)}.</p>
        ${buttonLink(`${holsUrl()}/requests`, "View in Hols")}
      `);
      return { subject, html, text };
    },
    async renderInApp(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const reviewer = displayName(request.reviewedBy?.name, request.reviewedBy?.email ?? "Manager");
      const dates = formatDateRange(request.startDate, request.endDate);
      return {
        title: "Vacation approved",
        body: `Your vacation (${dates}) was approved by ${reviewer}.`,
        url: `${holsUrl()}/requests`,
      };
    },
  },

  "hols.vacation.rejected": {
    async resolveRecipients(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const recipient = await userById(request.userId);
      return recipient ? [recipient] : [];
    },
    async render(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const reviewer = displayName(request.reviewedBy?.name, request.reviewedBy?.email ?? "Manager");
      const dates = formatDateRange(request.startDate, request.endDate);
      const reviewNote = request.reviewNote?.trim();
      const subject = "Your vacation request was rejected";
      const text = [
        `Your vacation (${dates}) was rejected by ${reviewer}.`,
        reviewNote ? `Note: ${reviewNote}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">Vacation rejected</h1>
        <p>Your vacation request for <strong>${escapeHtml(dates)}</strong> was rejected by ${escapeHtml(reviewer)}.</p>
        ${reviewNote ? `<p><strong>Note:</strong><br>${escapeHtml(reviewNote)}</p>` : ""}
        ${buttonLink(`${holsUrl()}/requests`, "View in Hols")}
      `);
      return { subject, html, text };
    },
    async renderInApp(payload) {
      const request = await loadVacationRequest(requireString(payload, "requestId"));
      const reviewer = displayName(request.reviewedBy?.name, request.reviewedBy?.email ?? "Manager");
      const dates = formatDateRange(request.startDate, request.endDate);
      const reviewNote = request.reviewNote?.trim();
      return {
        title: "Vacation rejected",
        body: `Your vacation (${dates}) was rejected by ${reviewer}.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
        url: `${holsUrl()}/requests`,
      };
    },
  },

  "assembly.questionnaire.submitted": {
    async resolveRecipients() {
      return assemblyOperators();
    },
    async render(payload) {
      const dealId = requireString(payload, "dealId");
      const partnerName = typeof payload.partnerName === "string" ? payload.partnerName : "Partner";
      const clientName = typeof payload.clientName === "string" ? payload.clientName : "";
      const subject = `Questionnaire submitted for ${dealId}`;
      const text = [
        `${partnerName} submitted an assembly questionnaire.`,
        clientName ? `Client: ${clientName}` : null,
        `Open: ${assemblyUrl()}/assemblies/${dealId}`,
      ]
        .filter(Boolean)
        .join("\n");
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">Assembly questionnaire submitted</h1>
        <p><strong>Partner:</strong> ${escapeHtml(partnerName)}</p>
        <p><strong>Deal ID:</strong> ${escapeHtml(dealId)}</p>
        ${clientName ? `<p><strong>Client:</strong> ${escapeHtml(clientName)}</p>` : ""}
        ${buttonLink(`${assemblyUrl()}/assemblies/${encodeURIComponent(dealId)}`, "View in Assembly")}
      `);
      return { subject, html, text };
    },
    async renderInApp(payload) {
      const dealId = requireString(payload, "dealId");
      const partnerName = typeof payload.partnerName === "string" ? payload.partnerName : "Partner";
      const clientName = typeof payload.clientName === "string" ? payload.clientName : "";
      return {
        title: "Assembly questionnaire submitted",
        body: `${partnerName} submitted a questionnaire for ${dealId}${clientName ? ` (${clientName})` : ""}.`,
        url: `${assemblyUrl()}/assemblies/${encodeURIComponent(dealId)}`,
      };
    },
  },

  "gateway.user.created": {
    async resolveRecipients(payload) {
      const recipient = await userById(requireString(payload, "userId"));
      return recipient ? [recipient] : [];
    },
    async render(payload) {
      const user = await prisma.user.findUnique({
        where: { id: requireString(payload, "userId") },
        select: { name: true, email: true },
      });
      if (!user) throw new Error("User not found");
      const name = displayName(user.name, user.email);
      const subject = "Your MEAVO account is ready";
      const text = `Hi ${name}, your MEAVO account has been created. Sign in at ${gatewayUrl()}/login`;
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">Welcome to MEAVO</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your MEAVO account has been created. Use your email address to sign in.</p>
        ${buttonLink(`${gatewayUrl()}/login`, "Sign in to MEAVO")}
      `);
      return { subject, html, text };
    },
    async renderInApp() {
      return {
        title: "Welcome to MEAVO",
        body: "Your MEAVO account has been created.",
        url: `${gatewayUrl()}/profile`,
      };
    },
  },

  "gateway.employee.hired": {
    async resolveRecipients(payload) {
      const employee = await prisma.employee.findUnique({
        where: { id: requireString(payload, "employeeId") },
        select: { userId: true },
      });
      if (!employee) return hrUsers();
      const employeeUser = await userById(employee.userId);
      const hr = await hrUsers();
      const combined = employeeUser ? [employeeUser, ...hr] : hr;
      const seen = new Set<string>();
      return combined.filter((recipient) => {
        const key = recipient.email.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    async render(payload, recipient) {
      const employee = await prisma.employee.findUnique({
        where: { id: requireString(payload, "employeeId") },
        include: { user: { select: { name: true, email: true } } },
      });
      if (!employee) throw new Error("Employee not found");
      const employeeName = displayName(employee.user.name, employee.user.email);
      const isEmployee =
        recipient.userId !== undefined && recipient.userId === employee.userId;
      const subject = isEmployee
        ? "Welcome — your MEAVO employment record is active"
        : `Employee hired: ${employeeName}`;
      const roleLine = `Role: ${employee.role}`;
      const startLine = `Start date: ${formatDate(employee.startDate)}`;
      if (isEmployee) {
        const text = `Hi ${employeeName}, your employment record is now active. ${roleLine}. ${startLine}.`;
        const html = emailLayout(`
          <h1 style="font-size: 20px; margin: 0 0 12px;">Welcome aboard</h1>
          <p>Hi ${escapeHtml(employeeName)},</p>
          <p>Your MEAVO employment record is now active.</p>
          <p><strong>${escapeHtml(roleLine)}</strong></p>
          <p><strong>${escapeHtml(startLine)}</strong></p>
          ${buttonLink(`${gatewayUrl()}/profile`, "View your profile")}
        `);
        return { subject, html, text };
      }
      const text = `${employeeName} was hired. ${roleLine}. ${startLine}.`;
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">Employee hired</h1>
        <p><strong>${escapeHtml(employeeName)}</strong> was added as an employee.</p>
        <p>${escapeHtml(roleLine)}</p>
        <p>${escapeHtml(startLine)}</p>
        ${buttonLink(`${gatewayUrl()}/hr/employees`, "Open HR")}
      `);
      return { subject, html, text };
    },
    async renderInApp(payload, recipient) {
      const employee = await prisma.employee.findUnique({
        where: { id: requireString(payload, "employeeId") },
        include: { user: { select: { name: true, email: true } } },
      });
      if (!employee) throw new Error("Employee not found");
      const employeeName = displayName(employee.user.name, employee.user.email);
      const isEmployee =
        recipient.userId !== undefined && recipient.userId === employee.userId;
      if (isEmployee) {
        return {
          title: "Welcome aboard",
          body: `Your MEAVO employment record is active. Role: ${employee.role}, start ${formatDate(employee.startDate)}.`,
          url: `${gatewayUrl()}/profile`,
        };
      }
      return {
        title: "Employee hired",
        body: `${employeeName} was hired as ${employee.role}, starting ${formatDate(employee.startDate)}.`,
        url: `${gatewayUrl()}/hr/employees`,
      };
    },
  },

  "gateway.employee.contract_ended": {
    async resolveRecipients() {
      return hrUsers();
    },
    async render(payload) {
      const employee = await prisma.employee.findUnique({
        where: { id: requireString(payload, "employeeId") },
        include: { user: { select: { name: true, email: true } } },
      });
      if (!employee) throw new Error("Employee not found");
      const employeeName = displayName(employee.user.name, employee.user.email);
      const endDate = employee.endDate ? formatDate(employee.endDate) : "—";
      const subject = `Contract ended: ${employeeName}`;
      const text = `${employeeName}'s contract ended on ${endDate}.`;
      const html = emailLayout(`
        <h1 style="font-size: 20px; margin: 0 0 12px;">Contract ended</h1>
        <p><strong>${escapeHtml(employeeName)}</strong>'s contract ended on <strong>${escapeHtml(endDate)}</strong>.</p>
        ${buttonLink(`${gatewayUrl()}/hr/employees`, "Open HR")}
      `);
      return { subject, html, text };
    },
    async renderInApp(payload) {
      const employee = await prisma.employee.findUnique({
        where: { id: requireString(payload, "employeeId") },
        include: { user: { select: { name: true, email: true } } },
      });
      if (!employee) throw new Error("Employee not found");
      const employeeName = displayName(employee.user.name, employee.user.email);
      const endDate = employee.endDate ? formatDate(employee.endDate) : "—";
      return {
        title: "Contract ended",
        body: `${employeeName}'s contract ended on ${endDate}.`,
        url: `${gatewayUrl()}/hr/employees`,
      };
    },
  },
};
