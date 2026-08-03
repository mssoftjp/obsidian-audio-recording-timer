import assert from "node:assert/strict";
import test from "node:test";
import {
  computeMinuteAlignedMaxStopAt,
  computeQuickEndTimes,
  remainingMinutesUntil,
} from "../src/time";

void test("builds eight fifteen-minute choices from 19:25", () => {
  const results = computeQuickEndTimes(
    new Date(2026, 7, 1, 19, 25, 0, 0),
    120,
  );

  assert.deepEqual(
    results.map((date) => [date.getHours(), date.getMinutes()]),
    [
      [19, 45],
      [20, 0],
      [20, 15],
      [20, 30],
      [20, 45],
      [21, 0],
      [21, 15],
      [21, 30],
    ],
  );
});

void test("rounds 19:40 plus fifteen minutes up to 20:00", () => {
  const [first] = computeQuickEndTimes(
    new Date(2026, 7, 1, 19, 40, 0, 0),
    120,
  );

  assert.deepEqual([first.getHours(), first.getMinutes()], [20, 0]);
});

void test("keeps an exact now plus fifteen-minute boundary", () => {
  const [first] = computeQuickEndTimes(
    new Date(2026, 7, 1, 19, 30, 0, 0),
    120,
  );

  assert.deepEqual([first.getHours(), first.getMinutes()], [19, 45]);
});

void test("does not round backward when the boundary has remaining seconds", () => {
  const [first] = computeQuickEndTimes(
    new Date(2026, 7, 1, 19, 30, 0, 1),
    120,
  );

  assert.deepEqual(
    [first.getHours(), first.getMinutes(), first.getSeconds(), first.getMilliseconds()],
    [20, 0, 0, 0],
  );
});

void test("rolls candidates into the next local day", () => {
  const [first] = computeQuickEndTimes(
    new Date(2026, 7, 1, 23, 45, 0, 0),
    120,
  );

  assert.equal(first.getDate(), 2);
  assert.deepEqual([first.getHours(), first.getMinutes()], [0, 0]);
});

void test("keeps candidates future and increasing during DST fall back", () => {
  const now = new Date(2026, 10, 1, 1, 30, 0, 0);
  const results = computeQuickEndTimes(now, 120);

  assert.deepEqual(
    results.map((date) => date.toISOString()),
    [
      "2026-11-01T05:45:00.000Z",
      "2026-11-01T06:00:00.000Z",
      "2026-11-01T06:15:00.000Z",
      "2026-11-01T06:30:00.000Z",
      "2026-11-01T06:45:00.000Z",
      "2026-11-01T07:00:00.000Z",
      "2026-11-01T07:15:00.000Z",
      "2026-11-01T07:30:00.000Z",
    ],
  );
  assert.ok(results.every((date) => date.getTime() > now.getTime()));
  assert.ok(
    results.every(
      (date, index) =>
        index === 0 || date.getTime() > (results[index - 1]?.getTime() ?? 0),
    ),
  );
});

void test("builds one candidate per fifteen minutes in the configured range", () => {
  const results = computeQuickEndTimes(
    new Date(2026, 7, 1, 9, 0, 0, 0),
    330,
  );

  assert.equal(results.length, 22);
  assert.deepEqual(
    [results.at(-1)?.getHours(), results.at(-1)?.getMinutes()],
    [14, 30],
  );
});

void test("rounds positive remaining time up to a whole minute", () => {
  assert.equal(remainingMinutesUntil(3_600_001, 0), 61);
  assert.equal(remainingMinutesUntil(60_000, 60_000), 0);
  assert.equal(remainingMinutesUntil(30_000, 60_000), 0);
});

void test("aligns the six-hour limit with the displayed clock minute", () => {
  const nowMs = new Date(2026, 7, 1, 19, 25, 42, 750).getTime();
  const stopAtMs = computeMinuteAlignedMaxStopAt(nowMs);
  const stopAt = new Date(stopAtMs);

  assert.deepEqual(
    [
      stopAt.getDate(),
      stopAt.getHours(),
      stopAt.getMinutes(),
      stopAt.getSeconds(),
      stopAt.getMilliseconds(),
    ],
    [2, 1, 25, 0, 0],
  );
  assert.ok(stopAtMs <= nowMs + 360 * 60_000);
  assert.ok(nowMs + 360 * 60_000 - stopAtMs < 60_000);
});
