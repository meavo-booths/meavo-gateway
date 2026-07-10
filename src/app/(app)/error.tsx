"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-12 max-w-md text-center">
      <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        An unexpected error occurred while loading this page. Try again, and if the
        problem persists, contact an admin.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-slate-400">Error reference: {error.digest}</p>
      )}
      <div className="mt-6">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </Card>
  );
}
