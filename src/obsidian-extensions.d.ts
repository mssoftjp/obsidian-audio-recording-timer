import type { Command } from "obsidian";

declare module "obsidian" {
  interface CommandManager {
    executeCommandById(commandId: string): boolean | void;
    listCommands(): Command[];
  }

  interface App {
    commands: CommandManager;
  }
}

