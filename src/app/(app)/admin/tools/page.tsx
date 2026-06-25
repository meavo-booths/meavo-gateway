import { ToolCardKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createToolCard } from "@/app/actions/admin";
import { AdminToolCards } from "@/components/admin-tool-cards";
import { ToolCardIconPicker } from "@/components/tool-card-icon-picker";
import { ToolCardKindFields } from "@/components/tool-card-kind-fields";
import { Button, Card, Input, Textarea } from "@/components/ui";

export default async function AdminToolsPage() {
  const [users, cards] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.toolCard.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { access: { select: { userId: true } } },
    }),
  ]);

  const userOptions = users.map((user) => ({
    id: user.id,
    label: user.name ? `${user.name} (${user.email})` : user.email,
  }));

  const usedLinkedAppKeys = cards
    .filter((card) => card.kind === ToolCardKind.APP_ACCESS && card.linkedAppKey)
    .map((card) => card.linkedAppKey as string);

  const toolCards = cards.map((card) => ({
    id: card.id,
    name: card.name,
    description: card.description,
    url: card.url,
    iconKey: card.iconKey,
    kind: card.kind,
    linkedAppKey: card.linkedAppKey,
    accessUserIds: card.access.map((a) => a.userId),
  }));

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Create tool card</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add a dashboard tile. Choose whether it only links out or also controls app sign-in.
        </p>
        <form action={createToolCard} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Name" name="name" required placeholder="Vacation Tracker" />
          <Input label="Link URL" name="url" type="url" required placeholder="https://..." />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              name="description"
              required
              placeholder="What this tool is for"
            />
          </div>
          <ToolCardKindFields usedLinkedAppKeys={usedLinkedAppKeys} />
          <ToolCardIconPicker />
          <div className="sm:col-span-2">
            <Button type="submit">Create card</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Tool cards</h2>
        <p className="mt-1 text-sm text-slate-500">
          App access cards control sign-in to Meavo tools. Link-only cards are dashboard bookmarks.
        </p>
        <AdminToolCards
          cards={toolCards}
          users={userOptions}
          usedLinkedAppKeys={usedLinkedAppKeys}
        />
      </Card>
    </div>
  );
}
