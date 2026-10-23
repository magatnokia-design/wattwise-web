import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthGrid,
  applyRangeTap,
  buildDayKwhMap,
  formatDayKwh,
  laterKey,
  CALENDAR_FIRST_DAY,
} from '../src/utils/calendarGrid.js';

// calendarGrid.js is byte-identical with the phone's; these cover both.

test('October 2026 starts on a Thursday, Monday-first, 42 cells', () => {
  const grid = buildMonthGrid(2026, 9);
  assert.equal(grid.length, 42);
  assert.deepEqual(grid.slice(0, 4), [null, null, null, '2026-10-01']);
  assert.equal(grid.filter(Boolean).length, 31);
});

test('a range takes two clicks and swaps an end clicked first', () => {
  const first = applyRangeTap({}, '2026-10-10');
  assert.deepEqual(first, { startDate: '2026-10-10', endDate: null });
  assert.deepEqual(applyRangeTap(first, '2026-10-03'), { startDate: '2026-10-03', endDate: '2026-10-10' });
});

test('nothing before April 2026 is offered', () => {
  assert.equal(CALENDAR_FIRST_DAY, '2026-04-01');
  assert.equal(laterKey('2025-12-01', CALENDAR_FIRST_DAY), '2026-04-01');
  assert.equal(laterKey(undefined, CALENDAR_FIRST_DAY), '2026-04-01');
});

test('day figures read either row shape and fit a cell', () => {
  assert.deepEqual(
    buildDayKwhMap([{ date: '2026-10-01', totalKwh: 1.2 }, { date: '2026-10-02', outlet1Energy: 0.5, outlet2Energy: 0.25 }]),
    { '2026-10-01': 1.2, '2026-10-02': 0.75 }
  );
  assert.equal(formatDayKwh(0), null);
  assert.equal(formatDayKwh(0.004), '<.01');
  assert.equal(formatDayKwh(1.234), '1.23');
  assert.equal(formatDayKwh(12.34), '12.3');
});
