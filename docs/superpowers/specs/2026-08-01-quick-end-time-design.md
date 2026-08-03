# Quick end time design

## Goal

Make a rounded clock time the primary way to schedule an audio recording stop, while preserving the existing Obsidian Audio recorder start/stop integration and the separate controls used during an active recording.

## User flow

The start modal presents controls in this order:

1. **Quick end time** — choose an absolute rounded end time.
2. **Add time** — move the selected end time later with plus-only minute adjustments.
3. **End time** — confirm or manually edit the final absolute clock time, or reset the selection.
4. **Start** — start core audio recording and retain the confirmed end time.

The initial modal has no selected end time. Add time buttons and Start are disabled until Quick end time or a complete manual End time selects a valid future time.

## Quick end-time candidates

- The rounding interval is 15 minutes.
- The first candidate is the first 15-minute clock boundary at or after `now + 15 minutes`.
- Later candidates advance in 15-minute increments.
- Candidate instants remain future and strictly increasing across daylight-saving transitions, even when local clock labels repeat.
- At 19:25 with the default range, the candidates are 19:45, 20:00, 20:15, 20:30, 20:45, 21:00, 21:15, and 21:30.
- Buttons show only the clock time. They do not show approximate-duration subtitles.
- A next-day candidate includes `(+1d)` so midnight rollover is unambiguous.

## Configurable range

- The default range is 120 minutes, producing eight quick choices.
- Users may increase the range in 30-minute increments in plugin settings.
- The configurable quick range is limited to 330 minutes, producing at most 22 quick choices. This keeps every rounded candidate within the existing six-hour recording limit, including the rounding allowance.
- Existing saved data migrates without losing command IDs, the last duration, or an active session.

## Linked state and time passage

End time is the authoritative value after selection.

- Selecting a Quick end time sets End time and derives Time remaining from `end time - now`.
- Pressing an Add time button adds that many minutes to End time, then recomputes Time remaining.
- Add time adjustment remains plus-only: `+1`, `+5`, `+10`, `+30`, and `+60` minutes.
- Manually choosing a complete End time sets the same authoritative absolute value and recomputes Time remaining.
- Reset, located beside End time, clears the selection, resets Time remaining to zero, disables Start, and regenerates current Quick end-time candidates.

While the modal remains open:

- With no selection, candidates refresh when the current rounding window changes.
- With a selection, End time stays fixed and Time remaining counts down.
- Add time adjustments never move End time beyond six hours from the current time.
- If End time passes, the selection clears, Start is disabled, and candidates regenerate.
- Start revalidates the remaining duration immediately before invoking the core recording command.

## Active recording

The existing active-recording modal remains separate from the start modal. It continues to show remaining time, End time, Stop now, and plus-only Extend controls. Extending an active session modifies its current absolute end time directly and remains subject to the six-hour session limit.

## Labels and layout

- The start modal uses **Add time** rather than **Duration** because the controls move a selected absolute End time later instead of setting a duration directly.
- The derived countdown label is **Time remaining:**.
- Quick end-time buttons fill the available width in four columns on desktop and two columns on narrow mobile layouts.
- The five Add time buttons share the full available width equally rather than forming a left-aligned button group.
- End time hour and minute dropdowns have a comfortable minimum width so two digits and the platform dropdown indicator remain fully visible.
- Reset remains beside End time.

## Documentation screenshot

- `docs/screenshots/start-recording-with-timer.png` shows the actual updated Obsidian start modal in a selected Quick end time state.
- The selected state shows all eight default Quick end-time candidates, enabled Add time controls, a non-zero Time remaining value, fully visible two-digit End time dropdowns, Reset, Start, and Cancel.
- The image contains only the modal surface. It excludes every pixel outside the modal, including the vault name, note titles and contents, sidebars, status information, other plugin views, and developer tools.
- Clock values are generic transient UI values and no recording is started while capturing the image.
- The final PNG is regenerated without source metadata or local filesystem information.
- The README continues to reference the same repository-relative screenshot path.

## Architecture

- `src/time.ts` owns pure local-time candidate generation and remaining-duration calculations.
- `src/data.ts` owns schema migration and normalization of the configurable quick range.
- `src/main.ts` exposes the setting getter/setter and retains recording lifecycle authority.
- `src/settings-tab.ts` exposes the quick range without changing command configuration.
- `src/modals/start-timer-modal.ts` owns modal presentation, linked selection state, ticking, and cleanup.
- `styles.css` owns responsive layout and selection styling; no inline production styling is introduced.

## Failure and boundary behavior

- Invalid persisted range values fall back to the default.
- Range values are clamped and rounded to a 30-minute increment; this setting increment is independent from the 15-minute candidate interval.
- Manual clock times in the past resolve to the next local day, matching existing behavior.
- A candidate or manual end time at or beyond the six-hour limit is clamped to a minute-aligned instant before recording starts, so displayed and scheduled times cannot diverge.
- The modal interval is always cleared on close.
- Mobile remains supported; quick and Add time buttons remain usable without horizontal clipping, and no Node or Electron runtime APIs are added.

## Verification

- Pure tests cover the 19:25 sequence beginning at 19:45, 15-minute rounding, exact boundaries, midnight rollover, daylight-saving fall-back, candidate count, minute-aligned six-hour clamping, range normalization, and v1-to-v2 data migration.
- Interaction logic is covered by type checking and focused manual verification of selection, Add time adjustment, reset, time passage, manual End time, Start, and the separate active-recording modal.
- The project must pass `npm test`, `npm run lint`, `npm run typecheck`, and the production bundle build with deployment disabled.

## Out of scope

- Changing Obsidian Audio recorder command execution.
- Combining start and active-recording controls into one modal.
- Negative Add time adjustments.
- Changing the six-hour session maximum.
