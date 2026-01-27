import type { ActiveSession, TimerRecorderData } from "./data";
import { Notice, Platform, Plugin } from "obsidian";
import { detectAudioRecorderCommandIds } from "./command-utils";
import { MAX_DURATION_MINUTES, TICK_INTERVAL_MS } from "./constants";
import { createDefaultData, normalizeData } from "./data";
import { RecordingControlModal } from "./modals/recording-control-modal";
import { StartTimerModal } from "./modals/start-timer-modal";
import { TimerRecorderSettingTab } from "./settings-tab";
import { formatStatusBarText, minutesToMs } from "./time";

export default class TimerRecorderPlugin extends Plugin {
  private data: TimerRecorderData = createDefaultData();
  private statusBarEl?: HTMLElement;
  private tickIntervalId?: number;
  private isStopping = false;

  async onload(): Promise<void> {
    this.data = normalizeData(await this.loadData());

    this.addRibbonIcon("mic", "Start recording with timer", () => {
      this.openEntryModal();
    });

    this.addCommand({
      id: "start-recording-with-timer",
      name: "Start recording with timer",
      callback: () => this.openEntryModal(),
    });

    this.addCommand({
      id: "show-recording-timer",
      name: "Show recording timer",
      callback: () => this.openEntryModal(),
    });

    this.addSettingTab(new TimerRecorderSettingTab(this.app, this));

    if (!Platform.isMobile) {
      this.statusBarEl = this.addStatusBarItem();
      this.registerDomEvent(this.statusBarEl, "click", () => this.openEntryModal());
      this.updateStatusBar();
    }

    this.registerDomEvent(window, "focus", () => {
      void this.checkTimeUp();
    });
    this.registerDomEvent(document, "visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void this.checkTimeUp();
      }
    });

    await this.autoDetectCommandsIfNeeded();
    await this.restoreSessionIfNeeded();
  }

  onunload(): void {
    this.stopTicking();
    this.clearStatusBar();
  }

  getStartCommandId(): string | undefined {
    return this.data.startCommandId;
  }

  getStopCommandId(): string | undefined {
    return this.data.stopCommandId;
  }

  async setStartCommandId(value: string): Promise<void> {
    this.data.startCommandId = value.length > 0 ? value : undefined;
    await this.saveData(this.data);
  }

  async setStopCommandId(value: string): Promise<void> {
    this.data.stopCommandId = value.length > 0 ? value : undefined;
    await this.saveData(this.data);
  }

  getLastDurationMinutes(): number {
    return this.data.lastDurationMinutes ?? 25;
  }

  getActiveSession(): ActiveSession | undefined {
    return this.data.activeSession;
  }

  openEntryModal(): void {
    if (this.data.activeSession) {
      new RecordingControlModal(this.app, this).open();
    } else {
      new StartTimerModal(this.app, this).open();
    }
  }

  async startSessionWithTimer(stopAtMs: number, durationMinutes: number): Promise<boolean> {
    if (this.data.activeSession) {
      this.openEntryModal();
      return false;
    }

    if (!this.data.startCommandId || !this.data.stopCommandId) {
      new Notice("Configure the audio recorder commands in settings.");
      return false;
    }

    try {
      this.app.commands.executeCommandById(this.data.startCommandId);
    } catch {
      new Notice("Failed to start recording.");
      return false;
    }

    const startedAtMs = Date.now();
    const maxStopAtMs = startedAtMs + minutesToMs(MAX_DURATION_MINUTES);
    const finalStopAtMs = Math.min(stopAtMs, maxStopAtMs);

    this.data.activeSession = { startedAtMs, stopAtMs: finalStopAtMs };
    this.data.lastDurationMinutes = durationMinutes;
    await this.saveData(this.data);

    this.startTicking();
    await this.checkTimeUp();

    return true;
  }

  async stopNow(): Promise<void> {
    await this.stopSession({ auto: false });
  }

  async extendActiveSession(minutes: number): Promise<void> {
    const session = this.data.activeSession;
    if (!session) return;

    const addMs = minutesToMs(minutes);
    const maxStopAtMs = session.startedAtMs + minutesToMs(MAX_DURATION_MINUTES);
    session.stopAtMs = Math.min(session.stopAtMs + addMs, maxStopAtMs);

    await this.saveData(this.data);
    this.updateStatusBar();
  }

  private async stopSession({ auto }: { auto: boolean }): Promise<void> {
    const session = this.data.activeSession;
    if (!session) return;
    if (this.isStopping) return;
    if (!this.data.stopCommandId) {
      new Notice("Stop command is not configured.");
      return;
    }

    this.isStopping = true;
    try {
      this.app.commands.executeCommandById(this.data.stopCommandId);
      this.data.activeSession = undefined;
      await this.saveData(this.data);
      this.stopTicking();
      this.updateStatusBar();
      if (auto) new Notice("Recording stopped");
    } catch {
      new Notice("Failed to stop recording.");
    } finally {
      this.isStopping = false;
    }
  }

  private startTicking(): void {
    if (this.tickIntervalId !== undefined) return;
    this.tickIntervalId = window.setInterval(() => {
      void this.checkTimeUp();
    }, TICK_INTERVAL_MS);
  }

  private stopTicking(): void {
    if (this.tickIntervalId === undefined) return;
    window.clearInterval(this.tickIntervalId);
    this.tickIntervalId = undefined;
  }

  private updateStatusBar(): void {
    if (!this.statusBarEl) return;

    const session = this.data.activeSession;
    if (!session) {
      this.statusBarEl.setText("");
      return;
    }

    this.statusBarEl.setText(formatStatusBarText(session.stopAtMs, Date.now()));
  }

  private clearStatusBar(): void {
    if (!this.statusBarEl) return;
    this.statusBarEl.setText("");
  }

  private async checkTimeUp(): Promise<void> {
    const session = this.data.activeSession;
    this.updateStatusBar();
    if (!session) return;

    if (Date.now() >= session.stopAtMs) {
      await this.stopSession({ auto: true });
    }
  }

  private async autoDetectCommandsIfNeeded(): Promise<void> {
    if (this.data.startCommandId && this.data.stopCommandId) return;
    const detected = detectAudioRecorderCommandIds(this.app.commands.listCommands());
    const changed =
      (this.data.startCommandId === undefined && detected.startCommandId !== undefined) ||
      (this.data.stopCommandId === undefined && detected.stopCommandId !== undefined);

    this.data.startCommandId ??= detected.startCommandId;
    this.data.stopCommandId ??= detected.stopCommandId;

    if (changed) {
      await this.saveData(this.data);
    }
  }

  private async restoreSessionIfNeeded(): Promise<void> {
    if (!this.data.activeSession) return;
    this.startTicking();
    await this.checkTimeUp();
  }
}
