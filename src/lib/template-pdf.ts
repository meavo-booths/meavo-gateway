import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  type InlineRun,
  type InlineSize,
  type TemplateBlock,
  parseTemplateMarkup,
} from "@/lib/template-markup";

const NOTO_SANS_REGULAR_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
const NOTO_SANS_BOLD_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const BULLET_INDENT = 18;
const BODY_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 14;

const FONT_SIZES: Record<InlineSize, number> = {
  small: 9,
  normal: 11,
  large: 13,
};

const HEADING_SIZES: Record<1 | 2 | 3, number> = {
  1: 18,
  2: 14,
  3: 12,
};

let cachedRegularFontBytes: ArrayBuffer | null = null;
let cachedBoldFontBytes: ArrayBuffer | null = null;

async function loadFontBytes(url: string, cache: "regular" | "bold"): Promise<ArrayBuffer> {
  if (cache === "regular" && cachedRegularFontBytes) return cachedRegularFontBytes;
  if (cache === "bold" && cachedBoldFontBytes) return cachedBoldFontBytes;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load PDF font.");
  }

  const bytes = await response.arrayBuffer();
  if (cache === "regular") cachedRegularFontBytes = bytes;
  else cachedBoldFontBytes = bytes;
  return bytes;
}

type FontSet = {
  regular: PDFFont;
  bold: PDFFont;
};

type LayoutRun = {
  text: string;
  font: PDFFont;
  size: number;
};

type LayoutLine = {
  runs: LayoutRun[];
  align: "left" | "center";
  xOffset: number;
  lineHeight: number;
  isBlank?: boolean;
};

function lineHeightForSize(size: number): number {
  return Math.round(size * 1.45);
}

function resolveSize(size: InlineSize | undefined, blockBaseSize: number): number {
  if (!size || size === "normal") return blockBaseSize;
  return FONT_SIZES[size];
}

function flattenRuns(
  runs: InlineRun[],
  fonts: FontSet,
  blockBaseSize: number,
  forceBold = false
): LayoutRun[] {
  const result: LayoutRun[] = [];

  for (const run of runs) {
    const size = resolveSize(run.size, blockBaseSize);
    const font = run.bold || forceBold ? fonts.bold : fonts.regular;
    if (!run.text) continue;

    const words = run.text.split(/(\s+)/);
    for (const part of words) {
      if (!part) continue;
      const last = result[result.length - 1];
      if (last && last.font === font && last.size === size) {
        last.text += part;
      } else {
        result.push({ text: part, font, size });
      }
    }
  }

  return result;
}

function measureRuns(runs: LayoutRun[]): number {
  return runs.reduce((total, run) => total + run.font.widthOfTextAtSize(run.text, run.size), 0);
}

function wrapRuns(runs: LayoutRun[], maxWidth: number): LayoutRun[][] {
  const lines: LayoutRun[][] = [];
  let currentLine: LayoutRun[] = [];
  let currentWidth = 0;

  function pushLine() {
    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
  }

  for (const run of runs) {
    const parts = run.text.split(/(\s+)/).filter((part) => part.length > 0);
    for (const part of parts) {
      const partWidth = run.font.widthOfTextAtSize(part, run.size);
      const isWhitespace = /^\s+$/.test(part);

      if (!isWhitespace && currentWidth + partWidth > maxWidth && currentLine.length > 0) {
        pushLine();
      }

      if (!isWhitespace && partWidth > maxWidth) {
        let remaining = part;
        while (remaining.length > 0) {
          let chunk = remaining;
          while (chunk.length > 0 && run.font.widthOfTextAtSize(chunk, run.size) > maxWidth) {
            chunk = chunk.slice(0, -1);
          }
          if (!chunk.length) chunk = remaining.slice(0, 1);

          const last = currentLine[currentLine.length - 1];
          if (last && last.font === run.font && last.size === run.size) {
            last.text += chunk;
          } else {
            currentLine.push({ text: chunk, font: run.font, size: run.size });
          }
          currentWidth = measureRuns(currentLine);
          remaining = remaining.slice(chunk.length);
          if (remaining.length > 0) pushLine();
        }
        continue;
      }

      const last = currentLine[currentLine.length - 1];
      if (last && last.font === run.font && last.size === run.size) {
        last.text += part;
      } else {
        currentLine.push({ text: part, font: run.font, size: run.size });
      }
      currentWidth = measureRuns(currentLine);
    }
  }

  pushLine();
  return lines.length > 0 ? lines : [[]];
}

function layoutBlock(
  block: TemplateBlock,
  fonts: FontSet,
  contentWidth: number
): LayoutLine[] {
  if (block.type === "blank") {
    return [{ runs: [], align: "left", xOffset: 0, lineHeight: 8, isBlank: true }];
  }

  const baseSize =
    block.type === "heading" ? HEADING_SIZES[block.level] : BODY_FONT_SIZE;
  const forceBold = block.type === "heading";
  const runs = flattenRuns(block.runs, fonts, baseSize, forceBold);
  const maxWidth =
    block.type === "bullet" ? contentWidth - BULLET_INDENT : contentWidth;
  const wrapped = wrapRuns(runs, maxWidth);
  const align = block.type === "center" ? "center" : "left";
  const xOffset = block.type === "bullet" ? BULLET_INDENT : 0;
  const lineHeight = lineHeightForSize(baseSize);

  return wrapped.map((lineRuns, index) => ({
    runs:
      block.type === "bullet" && index === 0
        ? [{ text: "• ", font: fonts.regular, size: baseSize }, ...lineRuns]
        : block.type === "bullet"
          ? [{ text: "  ", font: fonts.regular, size: baseSize }, ...lineRuns]
          : lineRuns,
    align,
    xOffset,
    lineHeight,
  }));
}

function layoutDocument(blocks: TemplateBlock[], fonts: FontSet, contentWidth: number): LayoutLine[] {
  const lines: LayoutLine[] = [];

  for (const block of blocks) {
    const blockLines = layoutBlock(block, fonts, contentWidth);
    lines.push(...blockLines);

    if (block.type === "heading") {
      lines.push({
        runs: [],
        align: "left",
        xOffset: 0,
        lineHeight: block.level === 1 ? 10 : 6,
        isBlank: true,
      });
    }
  }

  return lines;
}

function drawLine(
  page: PDFPage,
  line: LayoutLine,
  y: number,
  contentWidth: number
) {
  if (line.isBlank) return;

  const lineWidth = measureRuns(line.runs);
  let x = MARGIN + line.xOffset;

  if (line.align === "center") {
    x = MARGIN + Math.max(0, (contentWidth - lineWidth) / 2);
  }

  for (const run of line.runs) {
    page.drawText(run.text, {
      x,
      y: y - run.size,
      size: run.size,
      font: run.font,
      color: rgb(0.15, 0.15, 0.15),
    });
    x += run.font.widthOfTextAtSize(run.text, run.size);
  }
}

export async function renderTemplatePdf({
  title,
  body,
}: {
  title: string;
  body: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let fonts: FontSet;
  try {
    const [regularBytes, boldBytes] = await Promise.all([
      loadFontBytes(NOTO_SANS_REGULAR_URL, "regular"),
      loadFontBytes(NOTO_SANS_BOLD_URL, "bold"),
    ]);
    fonts = {
      regular: await pdfDoc.embedFont(regularBytes),
      bold: await pdfDoc.embedFont(boldBytes),
    };
  } catch {
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fonts = { regular, bold };
  }

  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const blocks = parseTemplateMarkup(body);
  const lines = layoutDocument(blocks, fonts, contentWidth);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(title, {
    x: MARGIN,
    y: y - 4,
    size: TITLE_FONT_SIZE,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;

  for (const line of lines) {
    if (y < MARGIN + line.lineHeight) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    drawLine(page, line, y, contentWidth);
    y -= line.lineHeight;
  }

  return pdfDoc.save();
}
