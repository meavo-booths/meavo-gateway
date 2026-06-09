import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { NavBar } from "@/components/nav-bar";

const links: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/profile", label: "Account" },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const admin = await isAdmin(session.user.id);

  const visibleLinks = links.filter((link) => {
    if (link.adminOnly && !admin) return false;
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
