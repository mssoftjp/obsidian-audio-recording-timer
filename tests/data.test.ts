import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultData,
  normalizeData,
  normalizeQuickEndTimeRangeMinutes,
} from "../src/data";

void test("defaults quick end time range to 120 minutes", () => {
  assert.equal(createDefaultData().quickEndTimeRangeMinutes, 120);
});

void test("migrates v1 data and preserves existing values", () => {
  const migrated = normalizeData({
    version: 1,
    startCommandId: "audio-recorder:start",
    stopCommandId: "audio-recorder:stop",
    lastDurationMinutes: 45,
    activeSession: {
      startedAtMs: 1_000,
      stopAtMs: 2_000,
    },
  });

  assert.equal(migrated.version, 2);
  assert.equal(migrated.startCommandId, "audio-recorder:start");
  assert.equal(migrated.stopCommandId, "audio-recorder:stop");
  assert.equal(migrated.lastDurationMinutes, 45);
  assert.deepEqual(migrated.activeSession, {
    startedAtMs: 1_000,
    stopAtMs: 2_000,
  });
  assert.equal(migrated.quickEndTimeRangeMinutes, 120);
});

void test("normalizes the configurable range to supported increments", () => {
  assert.equal(normalizeQuickEndTimeRangeMinutes(135), 150);
  assert.equal(normalizeQuickEndTimeRangeMinutes(149), 150);
  assert.equal(normalizeQuickEndTimeRangeMinutes(60), 120);
  assert.equal(normalizeQuickEndTimeRangeMinutes(400), 330);
  assert.equal(normalizeQuickEndTimeRangeMinutes("invalid"), 120);
});

void test("normalizes a persisted v2 quick end time range", () => {
  const normalized = normalizeData({
    version: 2,
    quickEndTimeRangeMinutes: 275,
  });

  assert.equal(normalized.quickEndTimeRangeMinutes, 270);
});
