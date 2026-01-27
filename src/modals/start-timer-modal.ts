import type TimerRecorderPlugin from "../main";
import { App, ButtonComponent, DropdownComponent, Modal, Setting } from "obsidian";
import { DURATION_ADD_MINUTES_OPTIONS, MAX_DURATION_MINUTES } from "../constants";
import {
  computeStopAtFromEndTime,
  minutesToMs,
  minutesToDurationInputValue,
  toTimeInputValue,
} from "../time";

export class StartTimerModal extends Modal {
  private readonly plugin: TimerRecorderPlugin;
  private durationMinutes: number;
  private stopAtMs: number;
  private isSyncing = false;
  private durationTotalEl?: HTMLElement;
  private durationValueEl?: HTMLElement;
  private durationClockEl?: HTMLElement;
  private durationMaxEl?: HTMLElement;
  private endTimeHours?: DropdownComponent;
  private endTimeMinutes?: DropdownComponent;
  private durationAddButtons: ButtonComponent[] = [];
  private resetButton?: ButtonComponent;
  private startButton?: ButtonComponent;

  constructor(app: App, plugin: TimerRecorderPlugin) {
    super(app);
    this.plugin = plugin;
    this.durationMinutes = 0;
    this.stopAtMs = Date.now();
  }

  onOpen(): void {
    this.setTitle("Start recording with timer");
    this.contentEl.addClass("timer-recorder-start-modal");

    const durationSetting = new Setting(this.contentEl)
      .setName("Duration")
      .setDesc("Add minutes (up to 6 hours).");

    durationSetting.settingEl.addClass("timer-recorder-duration-setting");

    const durationControlEl = durationSetting.controlEl.createDiv({
      cls: "timer-recorder-duration-control",
    });
    const durationButtonsEl = durationControlEl.createDiv({ cls: "timer-recorder-duration-buttons" });
    this.durationTotalEl = durationControlEl.createDiv({ cls: "timer-recorder-duration-total" });
    this.durationTotalEl.createSpan({
      cls: "timer-recorder-duration-label",
      text: "Recording duration:",
    });
    this.durationValueEl = this.durationTotalEl.createSpan({ cls: "timer-recorder-duration-value" });
    this.durationClockEl = this.durationTotalEl.createSpan({ cls: "timer-recorder-duration-clock" });
    this.durationMaxEl = durationControlEl.createDiv({ cls: "timer-recorder-duration-max" });

    for (const minutes of DURATION_ADD_MINUTES_OPTIONS) {
      durationSetting.addButton((btn) => {
        btn.setButtonText(`+${minutes} min`).onClick(() => {
          this.addDurationMinutes(minutes);
        });
        durationButtonsEl.appendChild(btn.buttonEl);
        this.durationAddButtons.push(btn);
      });
    }

    durationSetting.addButton((btn) => {
      this.resetButton = btn;
      btn.setButtonText("Reset").onClick(() => {
        this.resetDuration();
      });
      durationButtonsEl.appendChild(btn.buttonEl);
    });

    const endTimeSetting = new Setting(this.contentEl).setName("End time");

    endTimeSetting.settingEl.addClass("timer-recorder-end-time-setting");

    const endTimeControlEl = endTimeSetting.controlEl.createDiv({ cls: "timer-recorder-end-time-control" });

    this.endTimeHours = new DropdownComponent(endTimeControlEl);
    this.endTimeHours.selectEl.addClass("timer-recorder-end-time-dropdown");
    for (let hour = 0; hour < 24; hour++) {
      const value = hour.toString().padStart(2, "0");
      this.endTimeHours.addOption(value, value);
    }

    endTimeControlEl.createSpan({ cls: "timer-recorder-end-time-separator", text: ":" });

    this.endTimeMinutes = new DropdownComponent(endTimeControlEl);
    this.endTimeMinutes.selectEl.addClass("timer-recorder-end-time-dropdown");
    for (let minute = 0; minute < 60; minute++) {
      const value = minute.toString().padStart(2, "0");
      this.endTimeMinutes.addOption(value, value);
    }

    this.syncEndTimeControls();
    this.endTimeHours.onChange(() => this.handleEndTimeChange());
    this.endTimeMinutes.onChange(() => this.handleEndTimeChange());

    this.updateDurationDisplay();

    new Setting(this.contentEl)
      .addButton((btn) =>
        (this.startButton = btn)
          .setButtonText("Start")
          .setCta()
          .setDisabled(this.durationMinutes <= 0)
          .onClick(() => void this.handleStart()),
      )
      .addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private addDurationMinutes(minutesToAdd: number): void {
    const minutes = Math.min(MAX_DURATION_MINUTES, Math.max(0, this.durationMinutes + minutesToAdd));
    this.durationMinutes = minutes;
    this.stopAtMs = Date.now() + minutesToMs(minutes);

    this.isSyncing = true;
    try {
      this.syncEndTimeControls();
    } finally {
      this.isSyncing = false;
    }

    this.updateDurationDisplay();
    this.updateStartButtonState();
  }

  private updateFromEndTime(value: string): void {
    const now = new Date();
    const candidate = computeStopAtFromEndTime(now, value);
    if (!candidate) return;

    const nowMs = now.getTime();
    const candidateMs = candidate.getTime();
    const diffMinutes = Math.ceil((candidateMs - nowMs) / 60_000);
    const minutes = Math.min(MAX_DURATION_MINUTES, Math.max(0, Math.round(diffMinutes)));

    this.durationMinutes = minutes;
    this.stopAtMs = diffMinutes > MAX_DURATION_MINUTES ? nowMs + minutesToMs(minutes) : candidateMs;

    this.isSyncing = true;
    try {
      this.syncEndTimeControls();
    } finally {
      this.isSyncing = false;
    }

    this.updateDurationDisplay();
    this.updateStartButtonState();
  }

  private updateDurationDisplay(): void {
    if (this.durationValueEl && this.durationClockEl) {
      const formatted = minutesToDurationInputValue(this.durationMinutes);
      this.durationValueEl.setText(`${this.durationMinutes} min`);
      this.durationClockEl.setText(`(${formatted})`);
    }

    const atMax = this.durationMinutes >= MAX_DURATION_MINUTES;
    if (this.durationMaxEl) {
      this.durationMaxEl.setText(atMax ? "Maximum duration is 6 hours." : "");
    }

    for (const btn of this.durationAddButtons) {
      btn.setDisabled(atMax);
    }

    this.resetButton?.setDisabled(this.durationMinutes === 0);
  }

  private resetDuration(): void {
    this.durationMinutes = 0;
    this.stopAtMs = Date.now();

    this.isSyncing = true;
    try {
      this.syncEndTimeControls();
    } finally {
      this.isSyncing = false;
    }

    this.updateDurationDisplay();
    this.updateStartButtonState();
  }

  private updateStartButtonState(): void {
    this.startButton?.setDisabled(this.durationMinutes <= 0);
  }

  private handleEndTimeChange(): void {
    if (this.isSyncing) return;
    const hours = this.endTimeHours?.getValue();
    const minutes = this.endTimeMinutes?.getValue();
    if (!hours || !minutes) return;
    this.updateFromEndTime(`${hours}:${minutes}`);
  }

  private syncEndTimeControls(): void {
    const [hours, minutes] = toTimeInputValue(new Date(this.stopAtMs)).split(":");
    if (!hours || !minutes) return;
    this.endTimeHours?.setValue(hours);
    this.endTimeMinutes?.setValue(minutes);
  }

  private async handleStart(): Promise<void> {
    if (this.durationMinutes <= 0) return;
    const ok = await this.plugin.startSessionWithTimer(this.stopAtMs, this.durationMinutes);
    if (ok) this.close();
  }
}
