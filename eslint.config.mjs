import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

const obsidianRulesOff = Object.fromEntries(
  Object.keys(obsidianmd.rules).map((ruleName) => [`obsidianmd/${ruleName}`, "off"]),
);

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "main.js",
      "dist/**",
      "build/**",
      "release/**",
      "releases/**",
      "spec/**",
      "package-lock.json",
      "tsconfig.json",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.mjs", "package.json", "package-lock.json", "tsconfig.json"],
    rules: obsidianRulesOff,
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        window: "readonly",
        activeDocument: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
]);
