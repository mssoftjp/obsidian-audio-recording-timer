import type { Command } from "obsidian";

const START_IDS = [
  "audio-recorder:start-recording",
  "audio-recorder:start",
  "audio-recorder:start-record",
];

const STOP_IDS = [
  "audio-recorder:stop-recording",
  "audio-recorder:stop",
  "audio-recorder:stop-record",
];

function isAudioRecorderCommandId(commandId: string): boolean {
  return commandId.startsWith("audio-recorder:");
}

export function isAudioRecorderStartCommandId(commandId: string): boolean {
  return isAudioRecorderCommandId(commandId) && /\bstart\b/i.test(commandId);
}

export function isAudioRecorderStopCommandId(commandId: string): boolean {
  return isAudioRecorderCommandId(commandId) && /\bstop\b/i.test(commandId);
}

export function filterAudioRecorderStartCommands(commands: Command[]): Command[] {
  return commands.filter((command) => isAudioRecorderStartCommandId(command.id));
}

export function filterAudioRecorderStopCommands(commands: Command[]): Command[] {
  return commands.filter((command) => isAudioRecorderStopCommandId(command.id));
}

function findFirstExisting(commands: Command[], ids: string[]): string | undefined {
  const idSet = new Set(commands.map((c) => c.id));
  return ids.find((id) => idSet.has(id));
}

export function detectAudioRecorderCommandIds(commands: Command[]): {
  startCommandId?: string;
  stopCommandId?: string;
} {
  const startExact = findFirstExisting(commands, START_IDS);
  const stopExact = findFirstExisting(commands, STOP_IDS);
  if (startExact && stopExact && startExact !== stopExact) {
    return { startCommandId: startExact, stopCommandId: stopExact };
  }

  const audioRecorder = commands.filter((c) => c.id.startsWith("audio-recorder:"));
  const startHeuristic =
    audioRecorder.find((c) => /\bstart\b/i.test(c.id) && /\brecord/i.test(c.id)) ??
    audioRecorder.find((c) => /\bstart\b/i.test(c.id));
  const stopHeuristic =
    audioRecorder.find((c) => /\bstop\b/i.test(c.id) && /\brecord/i.test(c.id)) ??
    audioRecorder.find((c) => /\bstop\b/i.test(c.id));

  if (startHeuristic?.id && stopHeuristic?.id && startHeuristic.id !== stopHeuristic.id) {
    return { startCommandId: startHeuristic.id, stopCommandId: stopHeuristic.id };
  }

  return {};
}

export function formatCommandChoice(command: Command): string {
  return `${command.name} (${command.id})`;
}
