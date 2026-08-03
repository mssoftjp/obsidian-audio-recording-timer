import {
  DEFAULT_QUICK_END_TIME_RANGE_MINUTES,
  MAX_DURATION_MINUTES,
  MAX_QUICK_END_TIME_RANGE_MINUTES,
  MIN_QUICK_END_TIME_RANGE_MINUTES,
  QUICK_END_TIME_RANGE_STEP_MINUTES,
} from "./constants";
import {
  isAudioRecorderStartCommandId,
  isAudioRecorderStopCommandId,
} from "./command-utils";

export interface ActiveSession {
  startedAtMs: number;
  stopAtMs: number;
}

export interface AudioRecordingTimerData {
  version: 2;
  startCommandId?: string;
  stopCommandId?: string;
  lastDurationMinutes?: number;
  quickEndTimeRangeMinutes: number;
  activeSession?: ActiveSession;
}

export const DEFAULT_LAST_DURATION_MINUTES = 25;

export function createDefaultData(): AudioRecordingTimerData {
  return {
    version: 2,
    startCommandId: "audio-recorder:start",
    stopCommandId: "audio-recorder:stop",
    lastDurationMinutes: DEFAULT_LAST_DURATION_MINUTES,
    quickEndTimeRangeMinutes: DEFAULT_QUICK_END_TIME_RANGE_MINUTES,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeLastDurationMinutes(value: unknown): number | undefined {
  const asNumber = toNumber(value);
  if (asNumber === undefined) return undefined;
  const clamped = Math.max(1, Math.min(MAX_DURATION_MINUTES, Math.round(asNumber)));
  return clamped;
}

export function normalizeQuickEndTimeRangeMinutes(value: unknown): number {
  const asNumber = toNumber(value);
  if (asNumber === undefined) return DEFAULT_QUICK_END_TIME_RANGE_MINUTES;

  const rounded =
    Math.round(asNumber / QUICK_END_TIME_RANGE_STEP_MINUTES) *
    QUICK_END_TIME_RANGE_STEP_MINUTES;
  return Math.max(
    MIN_QUICK_END_TIME_RANGE_MINUTES,
    Math.min(MAX_QUICK_END_TIME_RANGE_MINUTES, rounded),
  );
}

function normalizeActiveSession(value: unknown): ActiveSession | undefined {
  if (!isRecord(value)) return undefined;

  const startedAtMs = toNumber(value.startedAtMs);
  const stopAtMs = toNumber(value.stopAtMs);
  if (startedAtMs === undefined || stopAtMs === undefined) return undefined;
  if (startedAtMs <= 0 || stopAtMs <= 0) return undefined;
  if (stopAtMs <= startedAtMs) return undefined;

  return { startedAtMs, stopAtMs };
}

export function normalizeStartCommandId(value: unknown): string | undefined {
  const commandId = toString(value);
  return commandId && isAudioRecorderStartCommandId(commandId) ? commandId : undefined;
}

export function normalizeStopCommandId(value: unknown): string | undefined {
  const commandId = toString(value);
  return commandId && isAudioRecorderStopCommandId(commandId) ? commandId : undefined;
}

export function normalizeData(raw: unknown): AudioRecordingTimerData {
  const defaults = createDefaultData();
  if (!isRecord(raw)) return defaults;

  return {
    version: 2,
    startCommandId:
      normalizeStartCommandId(raw.startCommandId) ?? defaults.startCommandId,
    stopCommandId:
      normalizeStopCommandId(raw.stopCommandId) ?? defaults.stopCommandId,
    lastDurationMinutes:
      normalizeLastDurationMinutes(raw.lastDurationMinutes) ??
      defaults.lastDurationMinutes,
    quickEndTimeRangeMinutes: normalizeQuickEndTimeRangeMinutes(
      raw.quickEndTimeRangeMinutes,
    ),
    activeSession: normalizeActiveSession(raw.activeSession),
  };
}
