import { spawn } from "node:child_process";
import {
  mkdtemp,
  readdir,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, parse } from "node:path";
import esbuild from "esbuild";

const TEMP_DIRECTORY_PREFIX = "audio-recording-timer-tests-";
const TEST_TIME_ZONE = "America/New_York";

async function validateGeneratedDirectory(directoryPath) {
  const realTempRoot = await realpath(tmpdir());
  const realDirectoryPath = await realpath(directoryPath);
  const directoryStat = await stat(realDirectoryPath);

  if (!directoryStat.isDirectory()) {
    throw new Error("Generated test path is not a directory.");
  }

  if (
    dirname(realDirectoryPath) !== realTempRoot ||
    !basename(realDirectoryPath).startsWith(TEMP_DIRECTORY_PREFIX)
  ) {
    throw new Error("Refusing to use an unexpected test directory.");
  }

  return realDirectoryPath;
}

async function runNodeTests(testFiles) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", ...testFiles], {
      env: { ...process.env, TZ: TEST_TIME_ZONE },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`Test process ended with signal ${signal}.`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function runTests() {
  const entries = (await readdir("tests", { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
    .map((entry) => join("tests", entry.name))
    .sort();

  if (entries.length === 0) {
    throw new Error("No test files found.");
  }

  let generatedDirectory;
  try {
    generatedDirectory = await mkdtemp(
      join(tmpdir(), TEMP_DIRECTORY_PREFIX),
    );
    generatedDirectory = await validateGeneratedDirectory(generatedDirectory);

    const bundledTests = [];
    for (const entry of entries) {
      const outputFile = join(
        generatedDirectory,
        `${parse(entry).name}.mjs`,
      );
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        format: "esm",
        outfile: outputFile,
        platform: "node",
        target: "node20",
      });
      bundledTests.push(outputFile);
    }

    return await runNodeTests(bundledTests);
  } finally {
    if (generatedDirectory !== undefined) {
      const safeDirectory = await validateGeneratedDirectory(generatedDirectory);
      await rm(safeDirectory, { recursive: true });
    }
  }
}

try {
  process.exitCode = await runTests();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
