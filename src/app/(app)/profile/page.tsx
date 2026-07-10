import { redirect } from "next/navigation";
import { NotificationChannel } from "@prisma/client";
import { auth } from "@/lib/auth";
import type { EmployeeDetailsData } from "@/lib/employee-details";
import { getAdminNotificationEvents } from "@/lib/notifications/event-settings";
import { getUserNotificationPreferences } from "@/lib/notifications/preferences";
import { NOTIFICATION_EVENT_TYPES } from "@/lib/notifications/event-catalog";
import { prisma } from "@/lib/prisma";
import { resolveTeamColor } from "@/lib/team-colors";
import { ProfileEmployeeDetails } from "@/components/profile-employee-details";
import { ProfileForm } from "@/components/profile-form";
import {
  ProfileNotificationSettings,
  type ProfileNotificationEvent,
} from "@/components/profile-notification-settings";
import { PageHeader } from "@/components/ui";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, adminEvents, userPrefs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        teamMembers: {
          orderBy: { team: { name: "asc" } },
          select: {
            role: true,
            team: { select: { name: true, color: true } },
          },
        },
        employee: {
          select: {
            contract: true,
            employeeBirthdate: true,
            employeePersonalEmail: true,
            employeeHomeAddress: true,
            employeeHomeAddressBg: true,
            providerCompanyName: true,
            providerCompanyNameBg: true,
            providerCompanyAddress: true,
            providerCompanyAddressBg: true,
            providerCompanyRegNumber: true,
            providerCompanyVatNumber: true,
          },
        },
      },
    }),
    getAdminNotificationEvents(),
    getUserNotificationPreferences(session.user.id, NOTIFICATION_EVENT_TYPES),
  ]);

  if (!user) redirect("/login");

  const teams = user.teamMembers.map(({ role, team }) => ({
    name: team.name,
    color: resolveTeamColor(team.color),
    role,
  }));

  const notificationEvents: ProfileNotificationEvent[] = adminEvents
    .filter((event) => event.enabled)
    .map((event) => {
      const channels: ProfileNotificationEvent["channels"] = [];
      if (event.emailEnabled) channels.push({ channel: NotificationChannel.EMAIL, label: "Email" });
      if (event.inAppEnabled) channels.push({ channel: NotificationChannel.IN_APP, label: "Bell" });
      if (event.slackEnabled) channels.push({ channel: NotificationChannel.SLACK, label: "Slack" });
      const prefs = userPrefs.get(event.eventType);
      return {
        eventType: event.eventType,
        label: event.label,
        description: event.description,
        sourceApp: event.sourceApp,
        channels,
        prefs: {
          [NotificationChannel.EMAIL]: prefs?.email ?? true,
          [NotificationChannel.IN_APP]: prefs?.inApp ?? true,
          [NotificationChannel.SLACK]: prefs?.slack ?? true,
        },
      };
    })
    .filter((event) => event.channels.length > 0);

  const employeeDetails: EmployeeDetailsData | null = user.employee
    ? {
        contract: user.employee.contract,
        employeeBirthdate: user.employee.employeeBirthdate?.toISOString() ?? null,
        employeePersonalEmail: user.employee.employeePersonalEmail,
        employeeHomeAddress: user.employee.employeeHomeAddress,
        employeeHomeAddressBg: user.employee.employeeHomeAddressBg,
        providerCompanyName: user.employee.providerCompanyName,
        providerCompanyNameBg: user.employee.providerCompanyNameBg,
        providerCompanyAddress: user.employee.providerCompanyAddress,
        providerCompanyAddressBg: user.employee.providerCompanyAddressBg,
        providerCompanyRegNumber: user.employee.providerCompanyRegNumber,
        providerCompanyVatNumber: user.employee.providerCompanyVatNumber,
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Profile"
        description={
          employeeDetails
            ? "Manage your account, password, and employee details for contracts."
            : "Manage your display name and password."
        }
      />
      <ProfileForm email={user.email} name={user.name} image={user.image} teams={teams} />
      <ProfileNotificationSettings events={notificationEvents} />
      {employeeDetails && <ProfileEmployeeDetails employee={employeeDetails} />}
    </div>
  );
}
