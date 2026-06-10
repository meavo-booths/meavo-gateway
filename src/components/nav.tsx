import { auth } from "@/lib/auth";
import { hasHrAccess, isAdmin } from "@/lib/permissions";
import { NavBar } from "@/components/nav-bar";

const links: { href: string; label: string; adminOnly?: boolean; hrOnly?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/hr", label: "HR", hrOnly: true },
  { href: "/profile", label: "Profile" },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const [admin, hr] = await Promise.all([
    isAdmin(session.user.id),
    hasHrAccess(session.user.id),
  ]);

  const visibleLinks = links.filter((link) => {
    if (link.adminOnly && !admin) return false;
    if (link.hrOnly && !hr) return false;
    return true;
  });

  return (
    <NavBar
      links={visibleLinks}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
    />
  );
}
