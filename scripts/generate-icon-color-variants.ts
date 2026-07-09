/**
 * Generate black, gold, and cool colour variants for all base tool-card icons.
 * Run: npx tsx scripts/generate-icon-color-variants.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ICONS_DIR = join(process.cwd(), "public/icons/tool-cards");

const GREEN_BG = "#0C8F61";
const GREEN_FG = "#FAF9F7";

const VARIANTS = {
  black: { bg: "#212121", fg: "#FAF9F7" },
  gold: { bg: "#F4E3B1", fg: "#212121" },
  cool: { bg: "#E1E9EC", fg: "#212121" },
} as const;

function recolorSvg(svg: string, bg: string, fg: string): string {
  return svg
    .replaceAll(GREEN_BG, bg)
    .replaceAll(GREEN_FG, fg)
    .replaceAll(GREEN_BG.toLowerCase(), bg)
    .replaceAll(GREEN_FG.toLowerCase(), fg);
}

function isBaseIcon(filename: string): boolean {
  if (!filename.endsWith(".svg")) return false;
  if (filename.includes("--")) return false;
  return true;
}

function main() {
  const files = readdirSync(ICONS_DIR).filter(isBaseIcon);
  let written = 0;

  for (const file of files) {
    const baseName = file.replace(/\.svg$/, "");
    const source = readFileSync(join(ICONS_DIR, file), "utf8");

    for (const [variant, colors] of Object.entries(VARIANTS)) {
      const outName = `${baseName}--${variant}.svg`;
      const outPath = join(ICONS_DIR, outName);
      writeFileSync(outPath, recolorSvg(source, colors.bg, colors.fg));
      written++;
    }
  }

  console.log(`Generated ${written} colour variants from ${files.length} base icons.`);
}

main();
