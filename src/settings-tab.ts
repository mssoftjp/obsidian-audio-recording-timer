import type AudioRecordingTimerPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";
import {
  detectAudioRecorderCommandIds,
  filterAudioRecorderStartCommands,
  filterAudioRecorderStopCommands,
} from "./command-utils";
import {
  MAX_QUICK_END_TIME_RANGE_MINUTES,
  MIN_QUICK_END_TIME_RANGE_MINUTES,
  QUICK_END_TIME_RANGE_STEP_MINUTES,
} from "./constants";
import { CommandPickerModal } from "./modals/command-picker-modal";
import { listObsidianCommands } from "./obsidian-commands";

export class AudioRecordingTimerSettingTab extends PluginSettingTab {
  private readonly plugin: AudioRecordingTimerPlugin;

  constructor(app: App, plugin: AudioRecordingTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const commands = listObsidianCommands(this.app);
    const startCommands = filterAudioRecorderStartCommands(commands);
    const stopCommands = filterAudioRecorderStopCommands(commands);

    new Setting(containerEl)
      .setName("Quick end time range")
      .setDesc("Show rounded end-time choices up to this approximate duration.")
      .addDropdown((dropdown) => {
        for (
          let minutes = MIN_QUICK_END_TIME_RANGE_MINUTES;
          minutes <= MAX_QUICK_END_TIME_RANGE_MINUTES;
          minutes += QUICK_END_TIME_RANGE_STEP_MINUTES
        ) {
          dropdown.addOption(
            minutes.toString(),
            this.formatRangeMinutes(minutes),
          );
        }

        dropdown
          .setValue(this.plugin.getQuickEndTimeRangeMinutes().toString())
          .onChange((value) => {
            void this.saveQuickEndTimeRange(Number(value));
          });
      });

    new Setting(containerEl)
      .setName("Start command")
      .setDesc("Command ID used to start core audio recording.")
      .addText((text) => {
        text.setValue(this.plugin.getStartCommandId() ?? "");
        text.onChange((value) => {
          void this.plugin.setStartCommandId(value.trim());
        });
      })
      .addButton((btn) =>
        btn.setButtonText("Pick").onClick(() => {
          new CommandPickerModal(this.app, startCommands, (command) => {
            void this.plugin.setStartCommandId(command.id);
            this.display();
          }).open();
        }),
      );

    new Setting(containerEl)
      .setName("Stop command")
      .setDesc("Command ID used to stop core audio recording.")
      .addText((text) => {
        text.setValue(this.plugin.getStopCommandId() ?? "");
        text.onChange((value) => {
          void this.plugin.setStopCommandId(value.trim());
        });
      })
      .addButton((btn) =>
        btn.setButtonText("Pick").onClick(() => {
          new CommandPickerModal(this.app, stopCommands, (command) => {
            void this.plugin.setStopCommandId(command.id);
            this.display();
          }).open();
        }),
      );

    new Setting(containerEl)
      .setName("Auto-detect commands")
      .setDesc("Try to find core audio recorder start/stop commands automatically.")
      .addButton((btn) =>
        btn.setButtonText("Auto-detect").onClick(() => {
          const detected = detectAudioRecorderCommandIds(commands);
          if (detected.startCommandId) void this.plugin.setStartCommandId(detected.startCommandId);
          if (detected.stopCommandId) void this.plugin.setStopCommandId(detected.stopCommandId);
          this.display();
        }),
      );
  }

  private formatRangeMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hours`;
    return `${hours} hours ${remainingMinutes} minutes`;
  }

  private async saveQuickEndTimeRange(value: number): Promise<void> {
    await this.plugin.setQuickEndTimeRangeMinutes(value);
    this.display();
  }
}
