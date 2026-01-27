import esbuild from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";

const isProduction = process.argv.includes("production");
const isWatch = process.argv.includes("--watch");

async function loadDotenvIfPresent(dotenvPath = path.join(process.cwd(), ".env")) {
  try {
    const content = await fs.readFile(dotenvPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const equalsIndex = line.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();

      if (!key) continue;
      if (process.env[key] !== undefined) continue;

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function deployToObsidianPluginsDir() {
  const pluginsDir = process.env.OBSIDIAN_PLUGINS_DIR;
  if (!pluginsDir) return;

  const manifestRaw = await fs.readFile("manifest.json", "utf8");
  const manifest = JSON.parse(manifestRaw);
  const pluginId = manifest?.id;

  if (typeof pluginId !== "string" || !pluginId) {
    throw new Error("Invalid manifest.json: missing 'id'.");
  }

  const targetDir = path.join(pluginsDir, pluginId);
  await fs.mkdir(targetDir, { recursive: true });

  await fs.copyFile("dist/main.js", path.join(targetDir, "main.js"));
  await fs.copyFile("manifest.json", path.join(targetDir, "manifest.json"));

  if (await fileExists("styles.css")) {
    await fs.copyFile("styles.css", path.join(targetDir, "styles.css"));
  }
}

await loadDotenvIfPresent();

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  format: "cjs",
  platform: "browser",
  target: "es2018",
  sourcemap: isProduction ? false : "inline",
  minify: isProduction,
  external: ["obsidian"],
  logLevel: "info",
  plugins: [
    {
      name: "deploy-to-obsidian",
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length > 0) return;
          await deployToObsidianPluginsDir();
        });
      },
    },
  ],
};

await fs.mkdir("dist", { recursive: true });
await fs.copyFile("manifest.json", "dist/manifest.json");
if (await fileExists("styles.css")) {
  await fs.copyFile("styles.css", "dist/styles.css");
}

if (isWatch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
