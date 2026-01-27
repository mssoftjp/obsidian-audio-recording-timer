import { addIcon } from "obsidian";

export const TIMER_RECORDER_RIBBON_ICON_ID = "timer-recorder-mic";

export function registerTimerRecorderIcons(): void {
  // addIcon() expects inner SVG content within a 0 0 100 100 viewBox.
  //
  // Design: the standard mic, plus a clear ring so it doesn't look like the core icon.
  addIcon(
    TIMER_RECORDER_RIBBON_ICON_ID,
    `
<circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></circle>
<g transform="scale(4.166666666666667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
  <line x1="12" y1="19" x2="12" y2="22"></line>
  <line x1="8" y1="22" x2="16" y2="22"></line>
</g>
`.trim(),
  );
}
