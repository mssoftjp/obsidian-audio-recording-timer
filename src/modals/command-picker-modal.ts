import type { Command } from "obsidian";
import type { FuzzyMatch } from "obsidian";
import { App, FuzzySuggestModal } from "obsidian";
import { formatCommandChoice } from "../command-utils";

export class CommandPickerModal extends FuzzySuggestModal<Command> {
  private readonly commands: Command[];
  private readonly onPick: (command: Command) => void;

  constructor(
    app: App,
    commands: Command[],
    onPick: (command: Command) => void,
  ) {
    super(app);
    this.commands = commands;
    this.onPick = onPick;
    this.setPlaceholder("Search commands…");
  }

  getItems(): Command[] {
    return this.commands;
  }

  getItemText(item: Command): string {
    return formatCommandChoice(item);
  }

  renderSuggestion(item: FuzzyMatch<Command>, el: HTMLElement): void {
    el.createDiv({ text: item.item.name });
    el.createEl("small", { text: item.item.id });
  }

  onChooseItem(item: Command, _evt: MouseEvent | KeyboardEvent): void {
    this.onPick(item);
  }
}
