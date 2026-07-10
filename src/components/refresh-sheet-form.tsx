"use client";

import { useState, useTransition } from "react";
import { refreshSheetSource } from "@/app/actions/sheet-import";
import { Button } from "@/components/ui";

export function RefreshSheetForm({
  sourceId,
  configured,
}: {
  sourceId: string;
  configured: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await refreshSheetSource(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="flex flex-col items-end gap-2"
    >
      <input type="hidden" name="sourceId" value={sourceId} />
      <Button type="submit" disabled={!configured || pending}>
        {pending ? "Refreshing…" : "Refresh from sheet"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
