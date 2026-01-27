import { MAX_DURATION_MINUTES } from "./constants";

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function clampMinutes(value: number): number {
  return Math.max(1, Math.min(MAX_DURATION_MINUTES, Math.round(value)));
}

export function minutesToMs(minutes: number): number {
  return minutes * 60_000;
}

export function formatRemainingMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${minutes}:${pad2(seconds)}`;
}

export function formatClockTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function toTimeInputValue(date: Date): string {
  return formatClockTime(date);
}

export function minutesToDurationInputValue(minutes: number): string {
  const clamped = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${pad2(hours)}:${pad2(mins)}`;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function isDifferentLocalDay(a: Date, b: Date): boolean {
  return localDateKey(a) !== localDateKey(b);
}

export function formatStatusBarText(stopAtMs: number, nowMs: number): string {
  const now = new Date(nowMs);
  const stopAt = new Date(stopAtMs);
  const remaining = formatRemainingMs(stopAtMs - nowMs);
  const end = formatClockTime(stopAt);
  const daySuffix = isDifferentLocalDay(now, stopAt) ? " (+1d)" : "";
  return `Rec: ${remaining} \u2192 ${end}${daySuffix}`;
}

export function parseTimeInput(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function computeStopAtFromEndTime(now: Date, endTimeValue: string): Date | null {
  const parsed = parseTimeInput(endTimeValue);
  if (!parsed) return null;

  const candidate = new Date(now);
  candidate.setHours(parsed.hours, parsed.minutes, 0, 0);

  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}
