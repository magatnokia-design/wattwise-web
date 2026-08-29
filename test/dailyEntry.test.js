import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDailyEntry } from '../src/utils/dailyEntry.js';

/*
 * The regression this file exists to prevent, in the exact shape it shipped in.
 *
 * `liveTodayEntry || fallbackDaily` has been written and removed four times
 * across this project. It reads as a harmless default and is not: the fallback
 * is the last *rolled-up* day, so on a day with no readings the Daily tab
 * quietly showed another date's real figures.
 *
 * Reported by the user on 29 August 2026: 0.01 kWh and P0.09 presented as
 * today's usage on a morning the Hub had not been switched on. Those were
 * 28 August's numbers, and they matched that day's History row exactly - which
 * is what made it obvious they were real data from the wrong day rather than
 * noise.
 */

const YESTERDAYS_ROLLUP = {
  date: '2026-08-28',
  totalEnergy: 0.01,
  cost: 0.09,
  outlet1Energy: 0.01,
  outlet2Energy: 0,
};

const TODAY_LIVE = {
  date: '2026-08-29',
  totalEnergy: 0.436,
  outlet1Energy: 0.436,
  outlet2Energy: 0,
};

test('a day with readings shows those readings', () => {
  const { entry, lastMeasuredDateKey } = resolveDailyEntry(TODAY_LIVE, YESTERDAYS_ROLLUP);

  assert.equal(entry, TODAY_LIVE);
  // Nothing to explain: today is on screen.
  assert.equal(lastMeasuredDateKey, '');
});

test("a quiet day does NOT borrow the last rolled-up day's figures", () => {
  const { entry } = resolveDailyEntry(null, YESTERDAYS_ROLLUP);

  // The whole bug in one assertion. Before the fix this returned the 28th.
  assert.equal(entry, null);
});

test('a quiet day names the last day that did have readings', () => {
  const { lastMeasuredDateKey } = resolveDailyEntry(null, YESTERDAYS_ROLLUP);

  // So the screen can say "last recorded Aug 28" instead of printing its
  // figures as though they were today's.
  assert.equal(lastMeasuredDateKey, '2026-08-28');
});

test('a brand-new account has neither, and claims nothing', () => {
  const { entry, lastMeasuredDateKey } = resolveDailyEntry(null, null);

  assert.equal(entry, null);
  assert.equal(lastMeasuredDateKey, '');
});

test('a fallback with no usable date is not reported as one', () => {
  // A rollup document can exist without a date field; formatting that would
  // produce "Invalid Date" on screen.
  assert.equal(resolveDailyEntry(null, {}).lastMeasuredDateKey, '');
  assert.equal(resolveDailyEntry(null, { date: null }).lastMeasuredDateKey, '');
  assert.equal(resolveDailyEntry(null, { date: 20260828 }).lastMeasuredDateKey, '');
});

test('today wins even when it measured nothing at all', () => {
  // A live entry of zeroes is still today. Falling through to the fallback
  // because the number happens to be 0 would reintroduce the bug by another
  // route - the outlets reporting 0 W is an answer, not an absence.
  const quietToday = { date: '2026-08-29', totalEnergy: 0, outlet1Energy: 0, outlet2Energy: 0 };
  const { entry, lastMeasuredDateKey } = resolveDailyEntry(quietToday, YESTERDAYS_ROLLUP);

  assert.equal(entry, quietToday);
  assert.equal(lastMeasuredDateKey, '');
});
