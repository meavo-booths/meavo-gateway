import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const NOTO_SANS_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

let cachedFontBytes: ArrayBuffer | null = null;

async function loadUnicodeFont(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const response = await fetch(NOTO_SANS_URL);
  if (!response.ok) {
    throw new Error("Failed to load PDF font.");
  }
  cachedFontBytes = await response.arrayBuffer();
  return cachedFontBytes;
}

function wrapLine(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  if (!text) return [""];

  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
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

  let font;
  try {
    const fontBytes = await loadUnicodeFont();
    font = await pdfDoc.embedFont(fontBytes);
  } catch {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const measure = (value: string) => font.widthOfTextAtSize(value, FONT_SIZE);
  const lines = wrapLine(body, maxWidth, measure);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(title, {
    x: MARGIN,
    y: y - 4,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;

  for (const line of lines) {
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    page.drawText(line, {
      x: MARGIN,
      y: y - FONT_SIZE,
      size: FONT_SIZE,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= LINE_HEIGHT;
  }

  return pdfDoc.save();
}
