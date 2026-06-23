import { Button, Card } from "@/components/ui";
import { ToolCardIcon } from "@/components/tool-card-icon";

export function ToolCardTile({
  name,
  description,
  url,
  iconKey,
}: {
  name: string;
  description: string;
  url: string;
  iconKey?: string | null;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        {iconKey && <ToolCardIcon iconKey={iconKey} size={40} />}
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
      </div>
      <p className="mt-2 flex-1 text-sm text-slate-600">{description}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4">
        <Button type="button" className="w-full sm:w-auto">
          OPEN
        </Button>
      </a>
    </Card>
  );
}
