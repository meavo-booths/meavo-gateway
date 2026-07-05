export default function HrLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="h-4 w-80 rounded bg-slate-100" />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
        <div className="h-4 w-4/6 rounded bg-slate-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-3/6 rounded bg-slate-100" />
      </div>
    </div>
  );
}
