import { Nav } from "@/components/nav";

// Deliberately force-dynamic: without it, `next build` attempts to prerender
// these pages and runs their Prisma queries (including writes like the HR
// company-profile upsert) against the production database at build time.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">{children}</main>
    </>
  );
}
