"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadLibraryAsset } from "@/app/actions/library";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";

type UploadMeta = {
  fileName: string | null;
  updatedAt: string;
  uploadedByLabel: string | null;
};

type Props = {
  slug: string;
  hasFile: boolean;
  uploadMeta: UploadMeta | null;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function LibraryUploadModal({ slug, hasFile, uploadMeta }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(uploadLibraryAsset, null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {hasFile ? "Replace dashboard" : "Upload dashboard"}
      </Button>

      <Modal title="Upload dashboard" open={open} onClose={() => setOpen(false)} bodyClassName="">
            <p className="mt-1 text-sm text-slate-500">
              Upload a self-contained HTML export. Inline CSS and JS work best; relative asset paths
              may not load unless bundled in the file.
            </p>

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="slug" value={slug} />
              <div>
                <label htmlFor="library-file" className="block text-sm font-medium text-slate-700">
                  HTML file
                </label>
                <input
                  id="library-file"
                  name="file"
                  type="file"
                  accept=".html,.htm,text/html"
                  required
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
              {state?.error ? (
                <p className="text-sm text-red-600" role="alert">
                  {state.error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Uploading…" : hasFile ? "Replace" : "Upload"}
                </Button>
              </div>
            </form>

            {uploadMeta ? (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                {uploadMeta.fileName ? (
                  <>
                    Current file:{" "}
                    <span className="font-medium text-slate-700">{uploadMeta.fileName}</span>
                    {" · "}
                  </>
                ) : null}
                Updated {formatDate(uploadMeta.updatedAt)}
                {uploadMeta.uploadedByLabel ? ` by ${uploadMeta.uploadedByLabel}` : null}
              </p>
            ) : null}
      </Modal>
    </>
  );
}
