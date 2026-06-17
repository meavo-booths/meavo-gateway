"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/hr/employees", label: "Employees" },
  { href: "/hr/documentation", label: "Documentation" },
];

export function HrNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
      aria-label="HR sections"
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
