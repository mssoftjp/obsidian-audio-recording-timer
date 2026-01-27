import type TimerRecorderPlugin from "../main";
import { App, Modal, Setting, TextComponent } from "obsidian";
import { MAX_DURATION_MINUTES } from "../constants";
import {
  clampMinutes,
  computeStopAtFromEndTime,
  formatClockTime,
  formatRemainingMs,
  isDifferentLocalDay,
  minutesToMs,
  minutesToDurationInputValue,
  parseTimeInput,
  toTimeInputValue,
} from "../time";

export class StartTimerModal extends Modal {
  private readonly plugin: TimerRecorderPlugin;
  private durationMinutes: number;
  private stopAtMs: number;
  private isSyncing = false;
  private summaryEl?: HTMLElement;
  private endTimeInput?: TextComponent;
  private durationInput?: TextComponent;

  constructor(app: App, plugin: TimerRecorderPlugin) {
    super(app);
    this.plugin = plugin;
    this.durationMinutes = clampMinutes(this.plugin.getLastDurationMinutes());
    this.stopAtMs = Date.now() + minutesToMs(this.durationMinutes);
  }

  onOpen(): void {
    this.setTitle("Start recording with timer");

    const durationSetting = new Setting(this.contentEl)
      .setName("Duration")
      .setDesc("Set how long to record (up to 6 hours).");

    durationSetting.addText((text) => {
      this.durationInput = text;
      text.inputEl.type = "time";
      text.inputEl.step = "60";
      text.inputEl.min = "00:01";
      text.inputEl.max = "06:00";
      text.setValue(minutesToDurationInputValue(this.durationMinutes));
      text.onChange((value) => {
        if (this.isSyncing) return;
        this.updateFromDuration(value);
      });
    });

    const endTimeSetting = new Setting(this.contentEl)
      .setName("End time")
      .setDesc("Set when recording should stop.");

    endTimeSetting.addText((text) => {
      this.endTimeInput = text;
      text.inputEl.type = "time";
      text.inputEl.step = "60";
      text.setValue(toTimeInputValue(new Date(this.stopAtMs)));
      text.onChange((value) => {
        if (this.isSyncing) return;
        this.updateFromEndTime(value);
      });
    });

    this.summaryEl = this.contentEl.createEl("div");
    this.updateSummary();

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Start")
          .setCta()
          .onClick(() => {
            void this.handleStart();
          }),
      )
      .addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private updateFromDuration(value: string): void {
    const parsed = parseTimeInput(value);
    if (!parsed) return;
    const minutes = clampMinutes(parsed.hours * 60 + parsed.minutes);
    this.durationMinutes = minutes;
    this.stopAtMs = Date.now() + minutesToMs(minutes);

    this.isSyncing = true;
    try {
      this.durationInput?.setValue(minutesToDurationInputValue(minutes));
      this.endTimeInput?.setValue(toTimeInputValue(new Date(this.stopAtMs)));
    } finally {
      this.isSyncing = false;
    }

    this.updateSummary();
  }

  private updateFromEndTime(value: string): void {
    const now = new Date();
    const candidate = computeStopAtFromEndTime(now, value);
    if (!candidate) return;

    const nowMs = now.getTime();
    const candidateMs = candidate.getTime();
    const diffMinutes = Math.ceil((candidateMs - nowMs) / 60_000);
    const minutes = clampMinutes(diffMinutes);

    this.durationMinutes = minutes;
    this.stopAtMs = diffMinutes > MAX_DURATION_MINUTES ? nowMs + minutesToMs(minutes) : candidateMs;

    this.isSyncing = true;
    try {
      this.durationInput?.setValue(minutesToDurationInputValue(minutes));
      this.endTimeInput?.setValue(toTimeInputValue(new Date(this.stopAtMs)));
    } finally {
      this.isSyncing = false;
    }

    this.updateSummary();
  }

  private updateSummary(): void {
    if (!this.summaryEl) return;

    const now = new Date();
    const stopAt = new Date(this.stopAtMs);
    const remaining = formatRemainingMs(this.stopAtMs - now.getTime());
    const daySuffix = isDifferentLocalDay(now, stopAt) ? " (+1d)" : "";
    this.summaryEl.setText(
      `Duration: ${this.durationMinutes} min — Ends at: ${formatClockTime(stopAt)}${daySuffix} — Remaining: ${remaining}`,
    );
  }

  private async handleStart(): Promise<void> {
    const ok = await this.plugin.startSessionWithTimer(this.stopAtMs, this.durationMinutes);
    if (ok) this.close();
  }
}
