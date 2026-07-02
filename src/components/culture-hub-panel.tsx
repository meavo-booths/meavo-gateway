import { Card } from "@/components/ui";
import { CULTURE_HUB_CONTENT, type CultureHubItem } from "@/lib/culture-hub-content";

function CultureHubItemBlock({ item }: { item: CultureHubItem }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
      {item.body && <p className="mt-1 text-sm text-slate-700">{item.body}</p>}
      {item.bullets && item.bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CultureHubPanel() {
  const { title, columns } = CULTURE_HUB_CONTENT;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
      </div>

      <div className="grid lg:grid-cols-2">
        {columns.map((column, columnIndex) => (
          <div
            key={column.heading}
            className={columnIndex === 0 ? "border-b border-slate-200 lg:border-b-0 lg:border-r" : ""}
          >
            <div className="bg-[#EEDCDC] px-4 py-3 sm:px-5">
              <h3 className="text-sm font-semibold text-slate-900">{column.heading}</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {column.items.map((item) => (
                <CultureHubItemBlock key={item.title} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
