import { MeavoNavBar } from "@meavo/navigation";
import {
  getAccessibleTools,
  isMeavoAppKey,
  resolveCurrentToolId,
} from "@meavo/navigation/server";
import { signOutAction } from "@/app/actions/auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MEAVO_APP_KEY = isMeavoAppKey(process.env.MEAVO_APP_KEY)
  ? process.env.MEAVO_APP_KEY
  : "gateway";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "https://meavo.app";

const links: { href: string; label: string; adminOnly?: boolean; hrOnly?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/hr", label: "HR", hrOnly: true },
  { href: "/profile", label: "Profile" },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const admin = session.user.systemRole === "ADMIN";
  const hr = session.user.hrAccess;

  const visibleLinks = links.filter((link) => {
    if (link.adminOnly && !admin) return false;
    if (link.hrOnly && !hr) return false;
    return true;
  });

  const toolOptions = await getAccessibleTools(prisma, {
    userId: session.user.id,
    isAdmin: admin,
    gatewayUrl: GATEWAY_URL,
  });

  return (
    <MeavoNavBar
      links={visibleLinks}
      logoHref="/"
      toolSwitcher={{
        currentId: resolveCurrentToolId(toolOptions, MEAVO_APP_KEY),
        options: toolOptions,
      }}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      signOutAction={signOutAction}
    />
  );
}
