"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadLibraryAsset } from "@/app/actions/library";
import { Button, Card } from "@/components/ui";

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

export function MarketDashboardPanel({ slug, hasFile, uploadMeta }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(uploadLibraryAsset, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-6">
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upload dashboard</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a self-contained HTML export. Inline CSS and JS work best; relative asset
                paths may not load unless bundled in the file.
              </p>
            </div>
            <svg
              className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <form
            action={action}
            className="mt-4 space-y-4 border-t border-slate-100 pt-4"
          >
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
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : hasFile ? "Replace dashboard" : "Upload dashboard"}
            </Button>
          </form>
          {uploadMeta ? (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              {uploadMeta.fileName ? (
                <>
                  Current file: <span className="font-medium text-slate-700">{uploadMeta.fileName}</span>
                  {" · "}
                </>
              ) : null}
              Updated {formatDate(uploadMeta.updatedAt)}
              {uploadMeta.uploadedByLabel ? ` by ${uploadMeta.uploadedByLabel}` : null}
            </p>
          ) : null}
        </details>
      </Card>

      {hasFile ? (
        <iframe
          src={`/api/library/assets/${slug}/view`}
          title="Market Dashboard"
          className="h-[min(80vh,900px)] w-full rounded-lg border border-slate-200 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <Card className="flex min-h-[min(50vh,400px)] items-center justify-center">
          <p className="text-sm text-slate-500">Upload an HTML dashboard to get started.</p>
        </Card>
      )}
    </div>
  );
}
