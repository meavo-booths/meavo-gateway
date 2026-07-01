"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function HrSalariesMonthPicker({
  compareMonth,
}: {
  compareMonth: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">Compare month</span>
      <input
        type="month"
        defaultValue={compareMonth}
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value) {
            params.set("compareMonth", event.target.value);
          } else {
            params.delete("compareMonth");
          }
          const query = params.toString();
          router.push(query ? `/hr/salaries?${query}` : "/hr/salaries");
        }}
      />
    </label>
  );
}
