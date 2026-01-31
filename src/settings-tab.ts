import type AudioRecordingTimerPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { detectAudioRecorderCommandIds } from "./command-utils";
import { CommandPickerModal } from "./modals/command-picker-modal";

export class AudioRecordingTimerSettingTab extends PluginSettingTab {
  private readonly plugin: AudioRecordingTimerPlugin;

  constructor(app: App, plugin: AudioRecordingTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const commands = this.app.commands.listCommands();

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
          new CommandPickerModal(this.app, commands, (command) => {
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
          new CommandPickerModal(this.app, commands, (command) => {
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
}
