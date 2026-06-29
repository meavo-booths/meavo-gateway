export type InlineSize = "small" | "normal" | "large";

export type BlockAlign = "left" | "center";

export const CENTER_LINE_PREFIX = ">> ";

export type InlineRun = {
  text: string;
  bold?: boolean;
  size?: InlineSize;
};

export type TemplateBlock =
  | { type: "paragraph"; runs: InlineRun[]; align?: BlockAlign }
  | { type: "title"; runs: InlineRun[]; align?: BlockAlign }
  | { type: "heading"; level: 1 | 2 | 3; runs: InlineRun[]; align?: BlockAlign }
  | { type: "bullet"; runs: InlineRun[]; align?: BlockAlign }
  | { type: "blank" };

const BLOCK_PREFIXES: { prefix: string; block: (content: string) => TemplateBlock }[] = [
  { prefix: "### ", block: (content) => ({ type: "heading", level: 3, runs: parseInlineRuns(content) }) },
  { prefix: "## ", block: (content) => ({ type: "heading", level: 2, runs: parseInlineRuns(content) }) },
  { prefix: "# ", block: (content) => ({ type: "heading", level: 1, runs: parseInlineRuns(content) }) },
  { prefix: "! ", block: (content) => ({ type: "title", runs: parseInlineRuns(content) }) },
  { prefix: "- ", block: (content) => ({ type: "bullet", runs: parseInlineRuns(content) }) },
  { prefix: "* ", block: (content) => ({ type: "bullet", runs: parseInlineRuns(content) }) },
];

const BLOCK_STYLE_PREFIXES = ["### ", "## ", "# ", "! ", "- ", "* "] as const;

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "small"; value: string }
  | { kind: "large"; value: string };

export function stripCenterPrefix(line: string): { align: BlockAlign; rest: string } {
  if (line.startsWith(CENTER_LINE_PREFIX)) {
    return { align: "center", rest: line.slice(CENTER_LINE_PREFIX.length) };
  }
  return { align: "left", rest: line };
}

export function stripBlockStylePrefix(line: string): { prefix: string; rest: string } {
  for (const prefix of BLOCK_STYLE_PREFIXES) {
    if (line.startsWith(prefix)) {
      return { prefix, rest: line.slice(prefix.length) };
    }
  }
  return { prefix: "", rest: line };
}

export function getBlockAlign(block: TemplateBlock): BlockAlign {
  if (block.type === "blank") return "left";
  return block.align === "center" ? "center" : "left";
}

function withAlign(block: TemplateBlock, align: BlockAlign): TemplateBlock {
  if (block.type === "blank" || align === "left") return block;
  return { ...block, align: "center" };
}

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

  const { align, rest } = stripCenterPrefix(line);

  for (const { prefix, block } of BLOCK_PREFIXES) {
    if (rest.startsWith(prefix)) {
      return withAlign(block(rest.slice(prefix.length)), align);
    }
  }

  return withAlign({ type: "paragraph", runs: parseInlineRuns(rest) }, align);
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
      if (run.size === "small") html = `<span style="font-size:9pt">${html}</span>`;
      if (run.size === "large") html = `<span style="font-size:13pt">${html}</span>`;
      return html;
    })
    .join("");
}

function centerClass(align: BlockAlign): string {
  return align === "center" ? " text-center" : "";
}

export function templateMarkupToPreviewHtml(text: string): string {
  const blocks = parseTemplateMarkup(text);
  const parts: string[] = [];
  let bulletItems: string[] = [];
  let bulletAlign: BlockAlign = "left";

  function flushBullets() {
    if (bulletItems.length === 0) return;
    const listClass =
      bulletAlign === "center"
        ? "list-none pl-0 my-2 space-y-1 text-center"
        : "list-disc pl-5 my-2 space-y-1";
    parts.push(`<ul class="${listClass}">${bulletItems.join("")}</ul>`);
    bulletItems = [];
    bulletAlign = "left";
  }

  for (const block of blocks) {
    if (block.type === "bullet") {
      if (bulletItems.length > 0 && getBlockAlign(block) !== bulletAlign) {
        flushBullets();
      }
      bulletAlign = getBlockAlign(block);
      bulletItems.push(`<li>${runsToHtml(block.runs)}</li>`);
      continue;
    }

    flushBullets();

    if (block.type === "blank") {
      parts.push('<div class="h-2"></div>');
      continue;
    }

    const content = runsToHtml(block.runs);
    const align = getBlockAlign(block);

    if (block.type === "title") {
      parts.push(
        `<p class="font-bold mt-3 mb-2${centerClass(align)}" style="font-size:22pt">${content}</p>`
      );
      continue;
    }

    if (block.type === "heading") {
      const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
      const sizeClass =
        block.level === 1
          ? "text-xl font-bold mt-3 mb-2"
          : block.level === 2
            ? "text-lg font-bold mt-3 mb-1"
            : "text-base font-semibold mt-2 mb-1";
      parts.push(`<${tag} class="${sizeClass}${centerClass(align)}">${content}</${tag}>`);
      continue;
    }

    parts.push(`<p class="my-1${align === "center" ? " text-center my-2" : ""}">${content}</p>`);
  }

  flushBullets();
  return parts.join("");
}
