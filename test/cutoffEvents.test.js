import test from 'node:test';
import assert from 'node:assert/strict';

import { collectCutoffEvents, RECENT_WINDOW_MS } from '../src/components/dashboard/cutoffEvents.js';

const NOW = 1_760_000_000_000;

// The shape updateOutletMetrics writes to users/{uid}/outlets/{id}.safety.
const outlet = (outletNumber, safety = {}) => ({
  outletNumber,
  safety: {
    overPower: false,
    overPowerAtMs: 0,
    overPowerW: 0,
    limitW: 500,
    totalOverPower: false,
    totalOverPowerAtMs: 0,
    totalOverPowerW: 0,
    totalLimitW: 1000,
    ...safety,
  },
});

test('quiet outlets produce nothing', () => {
  assert.deepEqual(collectCutoffEvents([outlet(1), outlet(2)], NOW), []);
});

test('the iron: one outlet over its own limit', () => {
  const events = collectCutoffEvents(
    [outlet(1, { overPowerAtMs: NOW - 60_000, overPowerW: 1028.3 }), outlet(2)],
    NOW
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].scope, 'outlet');
  assert.equal(events[0].label, 'Outlet 1');
  assert.equal(events[0].drawW, 1028.3);
  assert.equal(events[0].limitW, 500);
  // Already cut by the time it is rendered - past tense, not a warning.
  assert.equal(events[0].live, false);
});

test('a combined breach is reported once, not once per outlet', () => {
  // updateOutletMetrics writes the total fields identically onto BOTH documents.
  // Reporting them per-outlet would show the user the same event twice.
  const total = { totalOverPowerAtMs: NOW - 30_000, totalOverPowerW: 1030 };
  const events = collectCutoffEvents([outlet(1, total), outlet(2, total)], NOW);

  assert.equal(events.length, 1);
  assert.equal(events[0].scope, 'combined');
  assert.equal(events[0].drawW, 1030);
  assert.equal(events[0].limitW, 1000);
});

test('an outlet breach and a combined breach are both reported, newest first', () => {
  const events = collectCutoffEvents(
    [
      outlet(1, {
        overPowerAtMs: NOW - 10_000,
        overPowerW: 1028.3,
        totalOverPowerAtMs: NOW - 90_000,
        totalOverPowerW: 1030,
      }),
      outlet(2, { totalOverPowerAtMs: NOW - 90_000, totalOverPowerW: 1030 }),
    ],
    NOW
  );

  assert.equal(events.length, 2);
  assert.equal(events[0].scope, 'outlet');
  assert.equal(events[1].scope, 'combined');
});

test('events older than the window are dropped', () => {
  const stale = collectCutoffEvents(
    [outlet(1, { overPowerAtMs: NOW - RECENT_WINDOW_MS - 1, overPowerW: 1028.3 })],
    NOW
  );
  assert.deepEqual(stale, []);

  const justInside = collectCutoffEvents(
    [outlet(1, { overPowerAtMs: NOW - RECENT_WINDOW_MS, overPowerW: 1028.3 })],
    NOW
  );
  assert.equal(justInside.length, 1);
});

test('still over the limit reads as live, for the 3 s grace before the relay opens', () => {
  const events = collectCutoffEvents(
    [outlet(1, { overPower: true, overPowerAtMs: NOW, overPowerW: 1028.3 })],
    NOW
  );

  assert.equal(events[0].live, true);
});

test('a missing safety block is not an event', () => {
  // Documents written before the safety fields shipped, and outlets that have
  // never breached, both arrive without them.
  assert.deepEqual(collectCutoffEvents([{ outletNumber: 1 }], NOW), []);
  assert.deepEqual(collectCutoffEvents([{ outletNumber: 1, safety: {} }], NOW), []);
});

test('no outlets at all is not a crash', () => {
  // The reduce seeds with null, so an empty list must not dereference it.
  assert.deepEqual(collectCutoffEvents([], NOW), []);
  assert.deepEqual(collectCutoffEvents(undefined, NOW), []);
});
