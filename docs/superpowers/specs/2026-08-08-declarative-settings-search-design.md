# Declarative settings search design

## Goal

Make every Audio Recording Timer setting discoverable through Obsidian's native settings search and remove the current Scorecard warning.

## Compatibility decision

- Raise `minAppVersion` from `1.8.0` to `1.13.0`.
- Use Obsidian's declarative settings API as the only settings implementation.
- Remove the deprecated imperative `display()` fallback instead of maintaining duplicate settings implementations.
- Preserve the existing `0.2.0` compatibility record in `versions.json`; prepare `0.2.1` as the first release requiring Obsidian 1.13.0.
- Update the `obsidian` development type package to `1.13.1`, the current npm-published official API package version that exposes the 1.13 declarative settings types.

## Settings definitions

`AudioRecordingTimerSettingTab.getSettingDefinitions()` returns four searchable definitions in the existing order:

1. **Quick end time range**
2. **Start command**
3. **Stop command**
4. **Auto-detect commands**

Each definition retains its existing name, description, value, side effects, and command-picker behavior.

- Quick end time range uses a native declarative dropdown control. The setting tab overrides `getControlValue()` and `setControlValue()` to bridge the control to the plugin's private, validated data store.
- Start command, Stop command, and Auto-detect commands use `render` callbacks because they include custom buttons and side effects.
- A pure definition factory owns the four searchable rows. The `PluginSettingTab` subclass supplies the plugin-specific persistence, command-picker, and refresh callbacks.

Obsidian indexes every definition's declarative `name` and `desc`, including rows with custom renderers.

## Runtime behavior

- `getSettingDefinitions()` performs no I/O and does not enumerate commands during search indexing.
- Command enumeration happens only inside the render callback for a command-related row.
- Quick range changes continue to pass through `setQuickEndTimeRangeMinutes()` via the setting tab's declarative control bridge.
- Command text changes continue to pass through `setStartCommandId()` and `setStopCommandId()`.
- Picking or auto-detecting a command calls `update()` so the declarative settings page refreshes from persisted values.
- No recording, timer, data-schema, network, desktop/mobile, or command-execution behavior changes.

## Release metadata

- Bump the project and manifest version to `0.2.1` so the historical `0.2.0 -> 1.8.0` mapping remains truthful.
- Add `"0.2.1": "1.13.0"` to `versions.json`.
- Do not create a Git tag, GitHub release, commit, or push in this task.

## Verification

- A regression test verifies that all four searchable definitions are present in order, that the range row uses the native dropdown control, and that the three command rows use render callbacks.
- Type checking verifies the definitions against the official `SettingDefinitionItem` API.
- Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run check`, `OBSIDIAN_PLUGINS_DIR= npm run build:dist`, `npm run verify:release`, and `git diff --check`.
- Review the final diff against the Obsidian plugin self-critique checklist and confirm no unrelated or identifying data is included.

## Out of scope

- Supporting Obsidian versions earlier than 1.13.0 in version 0.2.1 or later.
- Publishing the release or waiting for the public Scorecard rescan.
- Changing the visible settings or adding new configuration.
