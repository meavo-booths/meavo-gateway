"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "@/app/actions/admin";
import { Button } from "@/components/ui";

export function DeleteUserButton({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Delete ${userLabel}? This removes their account and tool access.`
            )
          ) {
            return;
          }

          setError(null);
          startTransition(async () => {
            const result = await deleteUser(userId);
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
