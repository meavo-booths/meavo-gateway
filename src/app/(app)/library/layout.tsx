import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return children;
}
