import type { SettingDefinition } from "obsidian";
import {
  MAX_QUICK_END_TIME_RANGE_MINUTES,
  MIN_QUICK_END_TIME_RANGE_MINUTES,
  QUICK_END_TIME_RANGE_STEP_MINUTES,
} from "./constants";

export const QUICK_END_TIME_RANGE_KEY = "quickEndTimeRangeMinutes";

export interface AudioRecordingTimerSettingActions {
  getStartCommandId(): string | undefined;
  getStopCommandId(): string | undefined;
  setStartCommandId(value: string): Promise<void>;
  setStopCommandId(value: string): Promise<void>;
  openStartCommandPicker(): void;
  openStopCommandPicker(): void;
  autoDetectCommands(): Promise<void>;
}

function createQuickEndTimeRangeOptions(): Record<string, string> {
  const options: Record<string, string> = {};

  for (
    let minutes = MIN_QUICK_END_TIME_RANGE_MINUTES;
    minutes <= MAX_QUICK_END_TIME_RANGE_MINUTES;
    minutes += QUICK_END_TIME_RANGE_STEP_MINUTES
  ) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    options[minutes.toString()] = remainingMinutes === 0
      ? `${hours} hours`
      : `${hours} hours ${remainingMinutes} minutes`;
  }

  return options;
}

export function createAudioRecordingTimerSettingDefinitions(
  actions: AudioRecordingTimerSettingActions,
): SettingDefinition[] {
  return [
    {
      name: "Quick end time range",
      desc: "Show rounded end-time choices up to this approximate duration.",
      control: {
        type: "dropdown",
        key: QUICK_END_TIME_RANGE_KEY,
        options: createQuickEndTimeRangeOptions(),
      },
    },
    {
      name: "Start command",
      desc: "Command ID used to start core audio recording.",
      render: (setting) => {
        setting
          .addText((text) => {
            text
              .setValue(actions.getStartCommandId() ?? "")
              .onChange((value) => {
                void actions.setStartCommandId(value.trim());
              });
          })
          .addButton((button) => {
            button
              .setButtonText("Pick")
              .onClick(() => actions.openStartCommandPicker());
          });
      },
    },
    {
      name: "Stop command",
      desc: "Command ID used to stop core audio recording.",
      render: (setting) => {
        setting
          .addText((text) => {
            text
              .setValue(actions.getStopCommandId() ?? "")
              .onChange((value) => {
                void actions.setStopCommandId(value.trim());
              });
          })
          .addButton((button) => {
            button
              .setButtonText("Pick")
              .onClick(() => actions.openStopCommandPicker());
          });
      },
    },
    {
      name: "Auto-detect commands",
      desc: "Try to find core audio recorder start/stop commands automatically.",
      render: (setting) => {
        setting.addButton((button) => {
          button
            .setButtonText("Auto-detect")
            .onClick(() => {
              void actions.autoDetectCommands();
            });
        });
      },
    },
  ];
}
