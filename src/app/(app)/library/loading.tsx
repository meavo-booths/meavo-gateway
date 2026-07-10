export default function LibraryLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="h-4 w-80 rounded bg-slate-100" />
      <div className="h-10 w-full max-w-md rounded-lg bg-slate-100" />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="h-64 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}
