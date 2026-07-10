"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/library/market-dashboard", label: "Marketing" },
  { href: "/library/revenue", label: "Revenue" },
  { href: "/library/culture-hub", label: "Culture Hub" },
  { href: "/library/app-news", label: "App News" },
];

export function LibraryNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
      aria-label="Library sections"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
