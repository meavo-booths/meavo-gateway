"use client";

import { useState, useTransition } from "react";

type ActionResult = { error?: string } | null | undefined | void;

/**
 * Shared submit handler for Server Action forms: tracks pending state, maps
 * `{ error }` results to a message, and runs `onSuccess` otherwise.
 */
export function useFormAction(
  action: (formData: FormData) => Promise<ActionResult>,
  options?: { onSuccess?: () => void },
) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        options?.onSuccess?.();
      }
    });
  };

  const clearError = () => setError(null);

  return { submit, error, pending, clearError };
}
