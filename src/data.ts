import { MAX_DURATION_MINUTES } from "./constants";

export interface ActiveSession {
  startedAtMs: number;
  stopAtMs: number;
}

export interface TimerRecorderData {
  version: 1;
  startCommandId?: string;
  stopCommandId?: string;
  lastDurationMinutes?: number;
  activeSession?: ActiveSession;
}

export const DEFAULT_LAST_DURATION_MINUTES = 25;

export function createDefaultData(): TimerRecorderData {
  return {
    version: 1,
    startCommandId: "audio-recorder:start",
    stopCommandId: "audio-recorder:stop",
    lastDurationMinutes: DEFAULT_LAST_DURATION_MINUTES,
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

function normalizeActiveSession(value: unknown): ActiveSession | undefined {
  if (!isRecord(value)) return undefined;

  const startedAtMs = toNumber(value.startedAtMs);
  const stopAtMs = toNumber(value.stopAtMs);
  if (startedAtMs === undefined || stopAtMs === undefined) return undefined;
  if (startedAtMs <= 0 || stopAtMs <= 0) return undefined;
  if (stopAtMs <= startedAtMs) return undefined;

  return { startedAtMs, stopAtMs };
}

export function normalizeData(raw: unknown): TimerRecorderData {
  const defaults = createDefaultData();
  if (!isRecord(raw)) return defaults;

  return {
    version: 1,
    startCommandId: toString(raw.startCommandId) ?? defaults.startCommandId,
    stopCommandId: toString(raw.stopCommandId) ?? defaults.stopCommandId,
    lastDurationMinutes:
      normalizeLastDurationMinutes(raw.lastDurationMinutes) ??
      defaults.lastDurationMinutes,
    activeSession: normalizeActiveSession(raw.activeSession),
  };
}
