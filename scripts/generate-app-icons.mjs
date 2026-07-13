import sharp from "sharp";
import toIco from "to-ico";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gatewayRoot = resolve(here, "..");
const workspaceRoot = resolve(gatewayRoot, "..");
const svgSourceDir = resolve(gatewayRoot, "public/icons/tool-cards");

const APPS = [
  {
    key: "hols",
    svgKey: "vacation",
    root: resolve(workspaceRoot, "Vacation Tracker"),
    appDir: "src/app",
  },
  {
    key: "assembly",
    svgKey: "assembly",
    root: resolve(workspaceRoot, "meavo-assembly"),
    appDir: "src/app",
  },
  {
    key: "sales",
    svgKey: "sales",
    root: resolve(workspaceRoot, "meavo-sales"),
    appDir: "src/app",
  },
  {
    key: "mrp",
    svgKey: "mrp",
    root: resolve(workspaceRoot, "meavo-mrp"),
    appDir: "src/app",
    generateFaviconIco: true,
  },
  {
    key: "factory",
    svgKey: "factory",
    root: resolve(workspaceRoot, "Meavo-Factory/apps/web"),
    appDir: "app",
  },
  {
    key: "rp",
    svgKey: "replacement",
    root: resolve(workspaceRoot, "meavo-rp"),
    appDir: "src/app",
  },
  {
    key: "clock",
    svgKey: "clock-in",
    root: resolve(workspaceRoot, "meavo-clock"),
    appDir: "src/app",
  },
  {
    key: "tasks",
    svgKey: "tasks",
    root: resolve(workspaceRoot, "meavo-tasks"),
    appDir: "src/app",
  },
];

const PNG_SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

function parseArgs(argv) {
  const appIndex = argv.indexOf("--app");
  if (appIndex === -1) return null;
  const value = argv[appIndex + 1];
  if (!value) {
    throw new Error("Missing value for --app");
  }
  return value;
}

async function generateForApp(app) {
  const sourceSvg = resolve(svgSourceDir, `${app.svgKey}.svg`);
  const appRoot = app.root;
  const appDir = resolve(appRoot, app.appDir);
  const publicIconsDir = resolve(appRoot, "public/icons");

  mkdirSync(appDir, { recursive: true });
  mkdirSync(publicIconsDir, { recursive: true });

  const svg = readFileSync(sourceSvg);
  copyFileSync(sourceSvg, resolve(appDir, "icon.svg"));
  copyFileSync(sourceSvg, resolve(publicIconsDir, "icon.svg"));

  for (const { name, size } of PNG_SIZES) {
    const outPath = resolve(publicIconsDir, name);
    await sharp(svg).resize(size, size).png().toFile(outPath);
    console.log(`  wrote public/icons/${name}`);
  }

  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(resolve(appDir, "apple-icon.png"));
  console.log("  wrote apple-icon.png");

  if (app.generateFaviconIco) {
    const sizes = [16, 32, 48];
    const pngBuffers = await Promise.all(
      sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()),
    );
    const ico = await toIco(pngBuffers);
    writeFileSync(resolve(appDir, "favicon.ico"), ico);
    console.log("  wrote favicon.ico");
  }

  console.log(`Done: ${app.key}`);
}

const selectedApp = parseArgs(process.argv);
const apps = selectedApp
  ? APPS.filter((app) => app.key === selectedApp)
  : APPS;

if (selectedApp && apps.length === 0) {
  throw new Error(
    `Unknown app "${selectedApp}". Valid keys: ${APPS.map((app) => app.key).join(", ")}`,
  );
}

for (const app of apps) {
  console.log(`Generating icons for ${app.key} from ${app.svgKey}.svg`);
  await generateForApp(app);
}
