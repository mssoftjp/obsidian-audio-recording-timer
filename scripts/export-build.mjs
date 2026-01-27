import fs from "node:fs/promises";
import path from "node:path";

function pad2(value) {
  return value.toString().padStart(2, "0");
}

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readManifestVersion() {
  const manifestRaw = await fs.readFile("manifest.json", "utf8");
  const manifest = JSON.parse(manifestRaw);
  const version = manifest?.version;
  if (typeof version !== "string" || version.trim() === "") {
    throw new Error("Invalid manifest.json: missing 'version'.");
  }
  return version;
}

async function exportBuild(mode) {
  const distDir = path.join(process.cwd(), "dist");
  const buildDir = path.join(process.cwd(), "build");

  let outputDir;
  if (mode === "release") {
    const version = await readManifestVersion();
    outputDir = path.join(buildDir, "release", version);
  } else if (mode === "debug") {
    outputDir = path.join(buildDir, "debug", formatTimestamp());
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  const candidates = [
    { from: path.join(distDir, "main.js"), to: "main.js", required: true },
    { from: path.join(distDir, "manifest.json"), to: "manifest.json", required: true },
    { from: path.join(distDir, "styles.css"), to: "styles.css", required: false },
  ];

  for (const file of candidates) {
    if (!(await fileExists(file.from))) {
      if (file.required) {
        throw new Error(`Missing build artifact: ${path.relative(process.cwd(), file.from)}`);
      }
      continue;
    }
    await fs.copyFile(file.from, path.join(outputDir, file.to));
  }

  console.log(`Exported ${mode} build to ${path.relative(process.cwd(), outputDir)}`);
}

const mode = process.argv[2];
if (mode !== "release" && mode !== "debug") {
  console.error("Usage: node scripts/export-build.mjs <release|debug>");
  process.exit(1);
}

await exportBuild(mode);
