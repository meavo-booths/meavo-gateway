"use client";

import { useTransition } from "react";
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

  return (
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

        startTransition(async () => {
          await deleteUser(userId);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
