import fs from "node:fs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifest = readJson("manifest.json");
const versions = readJson("versions.json");

const argvTag = process.argv[2];
const envTag = process.env.GITHUB_REF_NAME || process.env.TAG;
const expectedTag = argvTag || envTag || manifest.version;

if (typeof expectedTag !== "string" || expectedTag.trim() === "") {
  console.error(
    "No version provided. Pass a version as an argument, or set TAG / GITHUB_REF_NAME.",
  );
  process.exit(1);
}

if (manifest.version !== expectedTag) {
  console.error(
    `manifest.json version (${manifest.version}) does not match tag (${expectedTag}).`,
  );
  process.exit(1);
}

if (versions[expectedTag] !== manifest.minAppVersion) {
  console.error(
    `versions.json[${expectedTag}] (${versions[expectedTag]}) does not match manifest minAppVersion (${manifest.minAppVersion}).`,
  );
  process.exit(1);
}

