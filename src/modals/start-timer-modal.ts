import type AudioRecordingTimerPlugin from "../main";
import { App, ButtonComponent, DropdownComponent, Modal, Setting } from "obsidian";
import {
  DURATION_ADD_MINUTES_OPTIONS,
  TICK_INTERVAL_MS,
} from "../constants";
import {
  computeMinuteAlignedMaxStopAt,
  computeQuickEndTimes,
  computeStopAtFromEndTime,
  formatClockTime,
  isDifferentLocalDay,
  minutesToDurationInputValue,
  minutesToMs,
  remainingMinutesUntil,
  toTimeInputValue,
} from "../time";

export class StartTimerModal extends Modal {
  private readonly plugin: AudioRecordingTimerPlugin;
  private durationMinutes = 0;
  private stopAtMs?: number;
  private isSyncing = false;
  private quickEndTimes: Date[] = [];
  private quickEndTimeButtons: Array<{
    stopAtMs: number;
    button: ButtonComponent;
  }> = [];
  private tickIntervalId?: number;
  private quickEndTimeButtonsEl?: HTMLElement;
  private durationButtonsEl?: HTMLElement;
  private durationValueEl?: HTMLElement;
  private durationClockEl?: HTMLElement;
  private durationMaxEl?: HTMLElement;
  private selectionMessageEl?: HTMLElement;
  private endTimeHours?: DropdownComponent;
  private endTimeMinutes?: DropdownComponent;
  private durationAddButtons: ButtonComponent[] = [];
  private resetButton?: ButtonComponent;
  private startButton?: ButtonComponent;

  constructor(app: App, plugin: AudioRecordingTimerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen(): void {
    this.stopAtMs = undefined;
    this.durationMinutes = 0;
    this.quickEndTimes = [];
    this.quickEndTimeButtons = [];
    this.durationAddButtons = [];

    this.setTitle("Start recording with timer");
    this.contentEl.addClass("audio-recording-timer-start-modal");

    const quickEndTimeSetting = new Setting(this.contentEl)
      .setName("Quick end time")
      .setDesc("Choose a rounded clock time.");
    quickEndTimeSetting.settingEl.addClass(
      "audio-recording-timer-quick-end-time-setting",
    );
    this.quickEndTimeButtonsEl = quickEndTimeSetting.controlEl.createDiv({
      cls: "audio-recording-timer-quick-end-time-buttons",
    });

    const durationSetting = new Setting(this.contentEl)
      .setName("Add time")
      .setDesc("Move the selected end time later (up to 6 hours).");
    durationSetting.settingEl.addClass(
      "audio-recording-timer-duration-setting",
    );

    const durationControlEl = durationSetting.controlEl.createDiv({
      cls: "audio-recording-timer-duration-control",
    });
    this.durationButtonsEl = durationControlEl.createDiv({
      cls: "audio-recording-timer-duration-buttons",
    });

    for (const minutes of DURATION_ADD_MINUTES_OPTIONS) {
      const button = new ButtonComponent(this.durationButtonsEl)
        .setButtonText(`+${minutes} min`)
        .setDisabled(true)
        .onClick(() => {
          this.addDurationMinutes(minutes);
        });
      this.durationAddButtons.push(button);
    }

    const durationTotalEl = durationControlEl.createDiv({
      cls: "audio-recording-timer-duration-total",
    });
    durationTotalEl.createSpan({
      cls: "audio-recording-timer-duration-label",
      text: "Time remaining:",
    });
    this.durationValueEl = durationTotalEl.createSpan({
      cls: "audio-recording-timer-duration-value",
    });
    this.durationClockEl = durationTotalEl.createSpan({
      cls: "audio-recording-timer-duration-clock",
    });
    this.durationMaxEl = durationControlEl.createDiv({
      cls: "audio-recording-timer-duration-max",
    });

    const endTimeSetting = new Setting(this.contentEl).setName("End time");
    endTimeSetting.settingEl.addClass(
      "audio-recording-timer-end-time-setting",
    );
    const endTimeControlEl = endTimeSetting.controlEl.createDiv({
      cls: "audio-recording-timer-end-time-control",
    });

    this.endTimeHours = new DropdownComponent(endTimeControlEl);
    this.endTimeHours.selectEl.addClass(
      "audio-recording-timer-end-time-dropdown",
    );
    this.endTimeHours.addOption("", "--");
    for (let hour = 0; hour < 24; hour++) {
      const value = hour.toString().padStart(2, "0");
      this.endTimeHours.addOption(value, value);
    }

    endTimeControlEl.createSpan({
      cls: "audio-recording-timer-end-time-separator",
      text: ":",
    });

    this.endTimeMinutes = new DropdownComponent(endTimeControlEl);
    this.endTimeMinutes.selectEl.addClass(
      "audio-recording-timer-end-time-dropdown",
    );
    this.endTimeMinutes.addOption("", "--");
    for (let minute = 0; minute < 60; minute++) {
      const value = minute.toString().padStart(2, "0");
      this.endTimeMinutes.addOption(value, value);
    }

    this.resetButton = new ButtonComponent(endTimeControlEl)
      .setButtonText("Reset")
      .setDisabled(true)
      .onClick(() => {
        this.resetSelection();
      });
    this.resetButton.buttonEl.addClass(
      "audio-recording-timer-end-time-reset",
    );

    this.endTimeHours.onChange(() => this.handleEndTimeChange());
    this.endTimeMinutes.onChange(() => this.handleEndTimeChange());

    this.selectionMessageEl = this.contentEl.createDiv({
      cls: "audio-recording-timer-selection-message",
      attr: { "aria-live": "polite" },
    });

    new Setting(this.contentEl)
      .addButton((button) => {
        this.startButton = button;
        button
          .setButtonText("Start")
          .setCta()
          .setDisabled(true)
          .onClick(() => void this.handleStart());
      })
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => this.close()),
      );

    const nowMs = Date.now();
    this.syncEndTimeControls();
    this.refreshQuickEndTimesIfChanged(new Date(nowMs), true);
    this.updateDisplay(nowMs);
    this.tickIntervalId = window.setInterval(() => {
      this.handleTick(Date.now());
    }, TICK_INTERVAL_MS);
  }

  onClose(): void {
    if (this.tickIntervalId !== undefined) {
      window.clearInterval(this.tickIntervalId);
      this.tickIntervalId = undefined;
    }
    this.contentEl.empty();
  }

  private renderQuickEndTimes(candidates: Date[], now: Date): void {
    if (!this.quickEndTimeButtonsEl) return;

    this.quickEndTimeButtonsEl.empty();
    this.quickEndTimeButtons = [];

    for (const candidate of candidates) {
      const nextDaySuffix = isDifferentLocalDay(candidate, now)
        ? " (+1d)"
        : "";
      const button = new ButtonComponent(this.quickEndTimeButtonsEl)
        .setButtonText(`${formatClockTime(candidate)}${nextDaySuffix}`)
        .onClick(() => {
          this.selectQuickEndTime(candidate);
        });
      button.buttonEl.addClass(
        "audio-recording-timer-quick-end-time-button",
      );
      this.quickEndTimeButtons.push({
        stopAtMs: candidate.getTime(),
        button,
      });
    }

    this.updateQuickEndTimeButtonState();
  }

  private selectQuickEndTime(candidate: Date): void {
    this.stopAtMs = candidate.getTime();
    this.setSelectionMessage("");
    this.syncEndTimeControls();
    this.updateDisplay(Date.now());
  }

  private addDurationMinutes(minutesToAdd: number): void {
    const nowMs = Date.now();
    if (this.stopAtMs === undefined) return;
    if (nowMs >= this.stopAtMs) {
      this.resetSelection(
        "Selected end time has passed. Choose a new end time.",
        nowMs,
      );
      return;
    }

    const maxStopAtMs = computeMinuteAlignedMaxStopAt(nowMs);
    this.stopAtMs = Math.min(
      this.stopAtMs + minutesToMs(minutesToAdd),
      maxStopAtMs,
    );
    this.setSelectionMessage("");
    this.syncEndTimeControls();
    this.updateDisplay(nowMs);
  }

  private handleEndTimeChange(): void {
    if (this.isSyncing) return;

    const hours = this.endTimeHours?.getValue() ?? "";
    const minutes = this.endTimeMinutes?.getValue() ?? "";
    const now = new Date();

    if (!hours || !minutes) {
      this.stopAtMs = undefined;
      this.durationMinutes = 0;
      this.setSelectionMessage("");
      this.refreshQuickEndTimesIfChanged(now, true);
      this.updateDisplay(now.getTime());
      return;
    }

    const candidate = computeStopAtFromEndTime(
      now,
      `${hours}:${minutes}`,
    );
    if (!candidate) return;

    const nowMs = now.getTime();
    const maxStopAtMs = computeMinuteAlignedMaxStopAt(nowMs);
    this.stopAtMs = Math.min(candidate.getTime(), maxStopAtMs);
    this.setSelectionMessage("");
    this.syncEndTimeControls();
    this.updateDisplay(nowMs);
  }

  private syncEndTimeControls(): void {
    this.isSyncing = true;
    try {
      if (this.stopAtMs === undefined) {
        this.endTimeHours?.setValue("");
        this.endTimeMinutes?.setValue("");
        return;
      }

      const [hours, minutes] = toTimeInputValue(
        new Date(this.stopAtMs),
      ).split(":");
      if (!hours || !minutes) return;
      this.endTimeHours?.setValue(hours);
      this.endTimeMinutes?.setValue(minutes);
    } finally {
      this.isSyncing = false;
    }
  }

  private handleTick(nowMs: number): void {
    if (this.stopAtMs === undefined) {
      this.refreshQuickEndTimesIfChanged(new Date(nowMs));
      return;
    }

    if (nowMs >= this.stopAtMs) {
      this.resetSelection(
        "Selected end time has passed. Choose a new end time.",
        nowMs,
      );
      return;
    }

    this.updateDisplay(nowMs);
  }

  private refreshQuickEndTimesIfChanged(
    now: Date,
    force = false,
  ): void {
    const candidates = computeQuickEndTimes(
      now,
      this.plugin.getQuickEndTimeRangeMinutes(),
    );
    const changed =
      candidates.length !== this.quickEndTimes.length ||
      candidates.some(
        (candidate, index) =>
          candidate.getTime() !== this.quickEndTimes[index]?.getTime(),
      );
    if (!force && !changed) return;

    this.quickEndTimes = candidates;
    this.renderQuickEndTimes(candidates, now);
  }

  private resetSelection(message = "", nowMs = Date.now()): void {
    this.stopAtMs = undefined;
    this.durationMinutes = 0;
    this.setSelectionMessage(message);
    this.syncEndTimeControls();
    this.refreshQuickEndTimesIfChanged(new Date(nowMs), true);
    this.updateDisplay(nowMs);
  }

  private updateDisplay(nowMs: number): void {
    const hasSelection = this.stopAtMs !== undefined;
    this.durationMinutes = hasSelection
      ? remainingMinutesUntil(this.stopAtMs ?? nowMs, nowMs)
      : 0;

    if (this.durationValueEl && this.durationClockEl) {
      this.durationValueEl.setText(`${this.durationMinutes} min`);
      this.durationClockEl.setText(
        `(${minutesToDurationInputValue(this.durationMinutes)})`,
      );
    }

    const maxStopAtMs = computeMinuteAlignedMaxStopAt(nowMs);
    const atMax =
      this.stopAtMs !== undefined && this.stopAtMs >= maxStopAtMs;
    this.durationMaxEl?.setText(
      atMax ? "Maximum duration is 6 hours." : "",
    );

    for (const button of this.durationAddButtons) {
      button.setDisabled(!hasSelection || atMax);
    }
    this.durationButtonsEl?.toggleClass("is-disabled", !hasSelection);
    this.durationButtonsEl?.setAttribute(
      "aria-disabled",
      String(!hasSelection),
    );

    const hasManualInput =
      (this.endTimeHours?.getValue() ?? "") !== "" ||
      (this.endTimeMinutes?.getValue() ?? "") !== "";
    this.resetButton?.setDisabled(!hasSelection && !hasManualInput);
    this.startButton?.setDisabled(
      !hasSelection || this.durationMinutes <= 0,
    );
    this.updateQuickEndTimeButtonState();
  }

  private updateQuickEndTimeButtonState(): void {
    for (const { stopAtMs, button } of this.quickEndTimeButtons) {
      const isSelected = this.stopAtMs === stopAtMs;
      button.buttonEl.toggleClass("is-selected", isSelected);
      button.buttonEl.setAttribute("aria-pressed", String(isSelected));
    }
  }

  private setSelectionMessage(message: string): void {
    this.selectionMessageEl?.setText(message);
  }

  private async handleStart(): Promise<void> {
    const nowMs = Date.now();
    if (this.stopAtMs === undefined) return;
    if (nowMs >= this.stopAtMs) {
      this.resetSelection(
        "Selected end time has passed. Choose a new end time.",
        nowMs,
      );
      return;
    }

    const maxStopAtMs = computeMinuteAlignedMaxStopAt(nowMs);
    if (this.stopAtMs > maxStopAtMs) {
      this.stopAtMs = maxStopAtMs;
      this.syncEndTimeControls();
    }

    const durationMinutes = remainingMinutesUntil(this.stopAtMs, nowMs);
    if (durationMinutes <= 0) {
      this.resetSelection(
        "Selected end time has passed. Choose a new end time.",
        nowMs,
      );
      return;
    }

    this.durationMinutes = durationMinutes;
    this.updateDisplay(nowMs);
    const ok = await this.plugin.startSessionWithTimer(
      this.stopAtMs,
      durationMinutes,
    );
    if (ok) this.close();
  }
}
