import { addIcon } from "obsidian";

export const AUDIO_RECORDING_TIMER_RIBBON_ICON_ID = "audio-recording-timer-icon";

export function registerAudioRecordingTimerIcons(): void {
  // addIcon() expects inner SVG content within a 0 0 100 100 viewBox.
  //
  // Design: Lucide "timer", scaled to fit the 0 0 100 100 viewBox.
  addIcon(
    AUDIO_RECORDING_TIMER_RIBBON_ICON_ID,
    `
<g transform="scale(4.166666666666667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="10" x2="14" y1="2" y2="2"></line>
  <line x1="12" x2="15" y1="14" y2="11"></line>
  <circle cx="12" cy="14" r="8"></circle>
</g>
`.trim(),
  );
}
