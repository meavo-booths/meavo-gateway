import { Button, Card } from "@/components/ui";

export function ToolCardTile({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
      <p className="mt-2 flex-1 text-sm text-slate-600">{description}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4">
        <Button type="button" className="w-full sm:w-auto">
          OPEN
        </Button>
      </a>
    </Card>
  );
}
