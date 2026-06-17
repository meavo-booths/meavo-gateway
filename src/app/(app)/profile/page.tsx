import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { EmployeeDetailsData } from "@/lib/employee-details";
import { prisma } from "@/lib/prisma";
import { resolveTeamColor } from "@/lib/team-colors";
import { ProfileEmployeeDetails } from "@/components/profile-employee-details";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
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
  });

  if (!user) redirect("/login");

  const teams = user.teamMembers.map(({ role, team }) => ({
    name: team.name,
    color: resolveTeamColor(team.color),
    role,
  }));

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
    <div className="max-w-4xl">
      <PageHeader
        title="Profile"
        description={
          employeeDetails
            ? "Manage your account, password, and employee details for contracts."
            : "Manage your display name and password."
        }
      />
      <ProfileForm email={user.email} name={user.name} image={user.image} teams={teams} />
      {employeeDetails && <ProfileEmployeeDetails employee={employeeDetails} />}
    </div>
  );
}
