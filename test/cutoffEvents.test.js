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

test('a breach still in progress is not reported yet', () => {
  /*
   * The regression this exists for. updateOutletMetrics writes
   * `overPowerAtMs: isOverPower ? now : previous`, so while the breach is live
   * the timestamp is rewritten on every telemetry post - about once a second.
   * Since dismissal is by timestamp, reporting a live breach gave every post a
   * fresh identity and the banner reappeared within a second of being dismissed.
   * Observed on hardware: 10:07/1052.9 W became 10:08/1051.3 W.
   */
  const events = collectCutoffEvents(
    [outlet(1, { overPower: true, overPowerAtMs: NOW, overPowerW: 1028.3 })],
    NOW
  );

  assert.deepEqual(events, []);
});

test('a combined breach still in progress is not reported either', () => {
  const live = { totalOverPower: true, totalOverPowerAtMs: NOW, totalOverPowerW: 1052.9 };
  assert.deepEqual(collectCutoffEvents([outlet(1, live), outlet(2, live)], NOW), []);
});

test('the same breach keeps one identity once it has settled', () => {
  // What makes dismissal stick: two renders a minute apart see the same key.
  const settled = outlet(1, { overPowerAtMs: NOW - 120_000, overPowerW: 1051.3 });

  const first = collectCutoffEvents([settled], NOW);
  const later = collectCutoffEvents([settled], NOW + 60_000);

  assert.equal(first[0].key, later[0].key);
  assert.equal(first[0].atMs, later[0].atMs);
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
