"use client";

import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";

/**
 * Modal wrapping a single Server Action form: renders the fields, an error
 * line, and Cancel/Submit buttons; closes itself on success.
 */
export function FormModal({
  title,
  open,
  onClose,
  action,
  submitLabel,
  pendingLabel = "Saving…",
  maxWidthClassName = "max-w-sm",
  panelClassName = "max-h-[85vh] overflow-hidden p-4 sm:p-6",
  bodyClassName = "mt-4 max-h-[calc(85vh-7rem)] overflow-y-auto overscroll-contain pr-1",
  encType,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  action: (formData: FormData) => Promise<{ error?: string } | null | undefined | void>;
  submitLabel: string;
  pendingLabel?: string;
  maxWidthClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  encType?: string;
  children: React.ReactNode;
}) {
  const { submit, error, pending, clearError } = useFormAction(action, { onSuccess: onClose });

  const handleClose = () => {
    clearError();
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onClose={handleClose}
      maxWidthClassName={maxWidthClassName}
      panelClassName={panelClassName}
      bodyClassName={bodyClassName}
    >
      <form className="space-y-4" encType={encType} action={submit}>
        {children}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
