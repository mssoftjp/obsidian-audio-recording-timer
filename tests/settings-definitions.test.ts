import assert from "node:assert/strict";
import test from "node:test";
import { createAudioRecordingTimerSettingDefinitions } from "../src/settings-definitions";

void test("exposes every plugin setting to declarative search in display order", () => {
  const definitions = createAudioRecordingTimerSettingDefinitions({
    getStartCommandId: () => "audio-recorder:start",
    getStopCommandId: () => "audio-recorder:stop",
    setStartCommandId: async () => undefined,
    setStopCommandId: async () => undefined,
    openStartCommandPicker: () => undefined,
    openStopCommandPicker: () => undefined,
    autoDetectCommands: async () => undefined,
  });

  assert.deepEqual(
    definitions.map(({ name }) => name),
    [
      "Quick end time range",
      "Start command",
      "Stop command",
      "Auto-detect commands",
    ],
  );
  assert.equal(definitions[0]?.control?.type, "dropdown");
  for (const definition of definitions.slice(1)) {
    assert.equal(typeof definition.render, "function");
  }
});
