import type AudioRecordingTimerPlugin from "../main";
import { App, ButtonComponent, Modal, Notice, Setting } from "obsidian";
import { EXTEND_MINUTES_OPTIONS, MAX_DURATION_MINUTES, TICK_INTERVAL_MS } from "../constants";
import { formatClockTime, formatRemainingMs, isDifferentLocalDay } from "../time";

export class RecordingControlModal extends Modal {
  private readonly plugin: AudioRecordingTimerPlugin;
  private remainingEl?: HTMLElement;
  private endsAtEl?: HTMLElement;
  private maxEl?: HTMLElement;
  private intervalId?: number;
  private extendButtons: ButtonComponent[] = [];

  constructor(app: App, plugin: AudioRecordingTimerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen(): void {
    this.setTitle("Recording in progress");

    const session = this.plugin.getActiveSession();
    if (!session) {
      new Notice("No active recording timer.");
      this.close();
      return;
    }

    this.remainingEl = this.contentEl.createEl("div");
    this.endsAtEl = this.contentEl.createEl("div");
    this.maxEl = this.contentEl.createEl("div");

    new Setting(this.contentEl).addButton((btn) =>
      btn.setButtonText("Stop now").onClick(() => {
        void this.plugin.stopNow();
        this.close();
      }),
    );

    const extendSetting = new Setting(this.contentEl).setName("Extend");
    for (const minutes of EXTEND_MINUTES_OPTIONS) {
      extendSetting.addButton((btn) => {
        btn.setButtonText(`+${minutes} min`).onClick(() => {
          void this.plugin.extendActiveSession(minutes);
          this.updateDisplay();
        });
        this.extendButtons.push(btn);
      });
    }

    this.updateDisplay();
    this.intervalId = window.setInterval(() => {
      this.updateDisplay();
      const currentSession = this.plugin.getActiveSession();
      if (!currentSession) this.close();
    }, TICK_INTERVAL_MS);
  }

  onClose(): void {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.contentEl.empty();
  }

  private updateDisplay(): void {
    const session = this.plugin.getActiveSession();
    if (!session || !this.remainingEl || !this.endsAtEl || !this.maxEl) return;

    const now = new Date();
    const stopAt = new Date(session.stopAtMs);
    const remaining = formatRemainingMs(session.stopAtMs - now.getTime());

    const daySuffix = isDifferentLocalDay(now, stopAt) ? " (+1d)" : "";
    this.remainingEl.setText(`Remaining: ${remaining}`);
    this.endsAtEl.setText(`Ends at: ${formatClockTime(stopAt)}${daySuffix}`);

    const maxStopAtMs = session.startedAtMs + MAX_DURATION_MINUTES * 60_000;
    if (session.stopAtMs >= maxStopAtMs) {
      this.maxEl.setText("Maximum duration is 6 hours.");
      for (const btn of this.extendButtons) btn.setDisabled(true);
    } else {
      this.maxEl.setText("");
      for (const btn of this.extendButtons) btn.setDisabled(false);
    }
  }
}
