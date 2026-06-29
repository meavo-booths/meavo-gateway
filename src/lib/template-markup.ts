export type InlineSize = "small" | "normal" | "large";

export type InlineRun = {
  text: string;
  bold?: boolean;
  size?: InlineSize;
};

export type TemplateBlock =
  | { type: "paragraph"; runs: InlineRun[] }
  | { type: "heading"; level: 1 | 2 | 3; runs: InlineRun[] }
  | { type: "bullet"; runs: InlineRun[] }
  | { type: "center"; runs: InlineRun[] }
  | { type: "blank" };

const BLOCK_PREFIXES: { prefix: string; block: (content: string) => TemplateBlock }[] = [
  { prefix: "### ", block: (content) => ({ type: "heading", level: 3, runs: parseInlineRuns(content) }) },
  { prefix: "## ", block: (content) => ({ type: "heading", level: 2, runs: parseInlineRuns(content) }) },
  { prefix: "# ", block: (content) => ({ type: "heading", level: 1, runs: parseInlineRuns(content) }) },
  { prefix: ">> ", block: (content) => ({ type: "center", runs: parseInlineRuns(content) }) },
  { prefix: "- ", block: (content) => ({ type: "bullet", runs: parseInlineRuns(content) }) },
  { prefix: "* ", block: (content) => ({ type: "bullet", runs: parseInlineRuns(content) }) },
];

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "small"; value: string }
  | { kind: "large"; value: string };

function tokenizeInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;

  while (i < input.length) {
    if (input.startsWith("**", i)) {
      const end = input.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ kind: "bold", value: input.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    if (input.startsWith("{small}", i)) {
      const end = input.indexOf("{/small}", i + 7);
      if (end !== -1) {
        tokens.push({ kind: "small", value: input.slice(i + 7, end) });
        i = end + 8;
        continue;
      }
    }

    if (input.startsWith("{large}", i)) {
      const end = input.indexOf("{/large}", i + 7);
      if (end !== -1) {
        tokens.push({ kind: "large", value: input.slice(i + 7, end) });
        i = end + 8;
        continue;
      }
    }

    let next = input.length;
    const markers = ["**", "{small}", "{large}"];
    for (const marker of markers) {
      const index = input.indexOf(marker, i + 1);
      if (index !== -1 && index < next) next = index;
    }

    tokens.push({ kind: "text", value: input.slice(i, next) });
    i = next;
  }

  return tokens;
}

function pushRun(runs: InlineRun[], text: string, bold?: boolean, size?: InlineSize) {
  if (!text) return;
  const last = runs[runs.length - 1];
  if (last && last.bold === bold && last.size === size) {
    last.text += text;
    return;
  }
  runs.push({ text, bold, size });
}

function parseInlineRuns(input: string): InlineRun[] {
  const runs: InlineRun[] = [];

  for (const token of tokenizeInline(input)) {
    if (token.kind === "text") {
      pushRun(runs, token.value);
      continue;
    }

    const nested = parseInlineRuns(token.value);
    for (const run of nested) {
      const bold = token.kind === "bold" ? true : run.bold;
      const size =
        token.kind === "small" ? "small" : token.kind === "large" ? "large" : run.size;
      pushRun(runs, run.text, bold, size);
    }
  }

  if (runs.length === 0) {
    runs.push({ text: "" });
  }

  return runs;
}

function parseLine(line: string): TemplateBlock {
  if (!line.trim()) {
    return { type: "blank" };
  }

  for (const { prefix, block } of BLOCK_PREFIXES) {
    if (line.startsWith(prefix)) {
      return block(line.slice(prefix.length));
    }
  }

  return { type: "paragraph", runs: parseInlineRuns(line) };
}

export function parseTemplateMarkup(text: string): TemplateBlock[] {
  return text.split("\n").map(parseLine);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runsToHtml(runs: InlineRun[]): string {
  return runs
    .map((run) => {
      let html = escapeHtml(run.text);
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.size === "small") html = `<span class="text-[0.85em]">${html}</span>`;
      if (run.size === "large") html = `<span class="text-[1.15em]">${html}</span>`;
      return html;
    })
    .join("");
}

export function templateMarkupToPreviewHtml(text: string): string {
  const blocks = parseTemplateMarkup(text);
  const parts: string[] = [];
  let bulletItems: string[] = [];

  function flushBullets() {
    if (bulletItems.length === 0) return;
    parts.push(`<ul class="list-disc pl-5 my-2 space-y-1">${bulletItems.join("")}</ul>`);
    bulletItems = [];
  }

  for (const block of blocks) {
    if (block.type === "bullet") {
      bulletItems.push(`<li>${runsToHtml(block.runs)}</li>`);
      continue;
    }

    flushBullets();

    if (block.type === "blank") {
      parts.push('<div class="h-2"></div>');
      continue;
    }

    const content = runsToHtml(block.runs);

    if (block.type === "heading") {
      const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
      const sizeClass =
        block.level === 1
          ? "text-xl font-bold mt-3 mb-2"
          : block.level === 2
            ? "text-lg font-bold mt-3 mb-1"
            : "text-base font-semibold mt-2 mb-1";
      parts.push(`<${tag} class="${sizeClass}">${content}</${tag}>`);
      continue;
    }

    if (block.type === "center") {
      parts.push(`<p class="text-center my-2">${content}</p>`);
      continue;
    }

    parts.push(`<p class="my-1">${content}</p>`);
  }

  flushBullets();
  return parts.join("");
}
