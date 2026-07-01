import { Card } from "@/components/ui";

type Props = {
  slug: string;
  hasFile: boolean;
};

export function MarketDashboardPanel({ slug, hasFile }: Props) {
  if (hasFile) {
    return (
      <iframe
        src={`/api/library/assets/${slug}/view`}
        title="Market Dashboard"
        className="h-[min(calc(80vh+200px),1100px)] w-full rounded-lg border border-slate-200 bg-white"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }

  return (
    <Card className="flex min-h-[min(50vh,400px)] items-center justify-center">
      <p className="text-sm text-slate-500">Upload an HTML dashboard to get started.</p>
    </Card>
  );
}
