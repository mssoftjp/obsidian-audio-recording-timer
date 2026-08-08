import type AudioRecordingTimerPlugin from "./main";
import type { SettingDefinition } from "obsidian";
import { App, PluginSettingTab } from "obsidian";
import {
  detectAudioRecorderCommandIds,
  filterAudioRecorderStartCommands,
  filterAudioRecorderStopCommands,
} from "./command-utils";
import {
  createAudioRecordingTimerSettingDefinitions,
  QUICK_END_TIME_RANGE_KEY,
} from "./settings-definitions";
import { CommandPickerModal } from "./modals/command-picker-modal";
import { listObsidianCommands } from "./obsidian-commands";

export class AudioRecordingTimerSettingTab extends PluginSettingTab {
  private readonly plugin: AudioRecordingTimerPlugin;

  constructor(app: App, plugin: AudioRecordingTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinition[] {
    return createAudioRecordingTimerSettingDefinitions({
      getStartCommandId: () => this.plugin.getStartCommandId(),
      getStopCommandId: () => this.plugin.getStopCommandId(),
      setStartCommandId: (value) => this.plugin.setStartCommandId(value),
      setStopCommandId: (value) => this.plugin.setStopCommandId(value),
      openStartCommandPicker: () => this.openCommandPicker("start"),
      openStopCommandPicker: () => this.openCommandPicker("stop"),
      autoDetectCommands: () => this.autoDetectCommands(),
    });
  }

  getControlValue(key: string): unknown {
    if (key !== QUICK_END_TIME_RANGE_KEY) {
      throw new Error(`Unknown setting key: ${key}`);
    }

    return this.plugin.getQuickEndTimeRangeMinutes().toString();
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key !== QUICK_END_TIME_RANGE_KEY) {
      throw new Error(`Unknown setting key: ${key}`);
    }

    await this.plugin.setQuickEndTimeRangeMinutes(Number(value));
  }

  private openCommandPicker(kind: "start" | "stop"): void {
    const commands = listObsidianCommands(this.app);
    const matchingCommands = kind === "start"
      ? filterAudioRecorderStartCommands(commands)
      : filterAudioRecorderStopCommands(commands);

    new CommandPickerModal(this.app, matchingCommands, (command) => {
      void this.saveCommandAndRefresh(kind, command.id);
    }).open();
  }

  private async saveCommandAndRefresh(
    kind: "start" | "stop",
    commandId: string,
  ): Promise<void> {
    if (kind === "start") {
      await this.plugin.setStartCommandId(commandId);
    } else {
      await this.plugin.setStopCommandId(commandId);
    }
    this.update();
  }

  private async autoDetectCommands(): Promise<void> {
    const detected = detectAudioRecorderCommandIds(
      listObsidianCommands(this.app),
    );
    if (detected.startCommandId) {
      await this.plugin.setStartCommandId(detected.startCommandId);
    }
    if (detected.stopCommandId) {
      await this.plugin.setStopCommandId(detected.stopCommandId);
    }
    this.update();
  }
}
