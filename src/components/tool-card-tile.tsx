import { Button, Card } from "@/components/ui";
import { ToolCardIcon } from "@/components/tool-card-icon";
import type { ToolCardStats } from "@/lib/tool-card-stats";

function ToolCardStatsLine({ stats }: { stats: ToolCardStats }) {
  const { lines } = stats;

  if (lines.length === 1) {
    const [line] = lines;
    return (
      <p className="mt-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{line.value}</span> {line.label}
      </p>
    );
  }

  return (
    <p className="mt-3 text-sm text-slate-600">
      {lines.map((line, index) => (
        <span key={line.label}>
          {index > 0 && <span className="mx-1.5">·</span>}
          {line.label}:{" "}
          <span className="font-semibold text-slate-900">{line.value}</span>
        </span>
      ))}
    </p>
  );
}

export function ToolCardTile({
  name,
  description,
  url,
  iconKey,
  stats,
}: {
  name: string;
  description: string;
  url: string;
  iconKey?: string | null;
  stats?: ToolCardStats | null;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        {iconKey && <ToolCardIcon iconKey={iconKey} size={40} />}
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
      </div>
      <p className="mt-2 flex-1 text-sm text-slate-600">{description}</p>
      {stats && stats.lines.length > 0 && <ToolCardStatsLine stats={stats} />}
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4">
        <Button type="button" className="w-full sm:w-auto">
          OPEN
        </Button>
      </a>
    </Card>
  );
}
