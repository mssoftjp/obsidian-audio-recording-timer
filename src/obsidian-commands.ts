import type { App, Command } from "obsidian";

type CommandManagerLike = {
  executeCommandById?: (commandId: string) => boolean | void;
  listCommands?: () => Command[];
};

function isCommandManagerLike(value: unknown): value is CommandManagerLike {
  return typeof value === "object" && value !== null;
}

function getCommandManager(app: App): CommandManagerLike | undefined {
  const manager = app.commands as unknown;
  return isCommandManagerLike(manager) ? manager : undefined;
}

export function listObsidianCommands(app: App): Command[] {
  const manager = getCommandManager(app);
  if (typeof manager?.listCommands !== "function") return [];
  return manager.listCommands();
}

export function executeObsidianCommandById(app: App, commandId: string): boolean {
  const manager = getCommandManager(app);
  if (typeof manager?.executeCommandById !== "function") return false;
  return manager.executeCommandById(commandId) !== false;
}
