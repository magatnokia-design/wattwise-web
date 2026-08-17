import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveOutletBadge } from '../src/components/dashboard/outletBadge.js';

const badge = (args) =>
  resolveOutletBadge({
    isOn: true,
    isDrawing: false,
    telemetryFresh: true,
    switchingTo: null,
    ...args,
  });

test('a live draw is reported as drawing', () => {
  const result = badge({ isOn: true, isDrawing: true });
  assert.equal(result.text, 'Drawing power');
  assert.equal(result.tone, 'good');
});

test('switched on with a confirmed zero draw is idle', () => {
  // Legitimate: readings ARE arriving and they say 0 W. Nothing plugged in.
  const result = badge({ isOn: true, isDrawing: false, telemetryFresh: true });
  assert.equal(result.text, 'On, idle');
});

test('no readings never claims idle', () => {
  /*
   * The regression. "On, idle" asserts switched-on AND consuming nothing. The
   * first half survives a telemetry gap; the second does not. Because
   * buildOutletMetrics zeroes the metrics when telemetry is stale, isDrawing
   * goes false for want of data and the badge read "On, idle" - claiming an
   * outlet had nothing plugged into it on the strength of readings that stopped
   * arriving twelve seconds earlier.
   */
  const result = badge({ isOn: true, isDrawing: false, telemetryFresh: false });

  assert.equal(result.text, 'On · no reading');
  assert.notEqual(result.text, 'On, idle');
  assert.equal(result.tone, 'neutral');
});

test('no readings still reports the commanded state', () => {
  // A toggle is written to Firestore, so on/off is known whether or not the
  // hardware is talking. Only the load is unknown.
  assert.equal(badge({ isOn: false, telemetryFresh: false }).text, 'Off');
  assert.equal(badge({ isOn: true, telemetryFresh: false }).text, 'On · no reading');
});

test('a command in flight outranks everything', () => {
  assert.equal(badge({ switchingTo: 'off', isDrawing: true }).text, 'Switching off…');
  assert.equal(badge({ switchingTo: 'on', isDrawing: false }).text, 'Switching on…');

  // Including a telemetry gap - the transition is still the most useful truth.
  assert.equal(badge({ switchingTo: 'off', telemetryFresh: false }).text, 'Switching off…');
});

test('an off outlet with fresh readings is simply off', () => {
  assert.equal(badge({ isOn: false, isDrawing: false }).text, 'Off');
  assert.equal(badge({ isOn: false }).tone, 'neutral');
});

test('every state returns a tone the Badge component knows', () => {
  const tones = new Set(['good', 'warn', 'neutral', 'danger']);

  [true, false].forEach((isOn) =>
    [true, false].forEach((isDrawing) =>
      [true, false].forEach((telemetryFresh) =>
        [null, 'on', 'off'].forEach((switchingTo) => {
          const result = resolveOutletBadge({ isOn, isDrawing, telemetryFresh, switchingTo });
          assert.ok(tones.has(result.tone), `bad tone: ${result.tone}`);
          assert.ok(result.text.length > 0);
        })
      )
    )
  );
});

/*
 * The stuck relay outranks even a command in flight.
 *
 * This is the one badge state that describes an outlet WattWise does not
 * control. Everything else on this pill is a report about a system that is
 * working; "Will not switch off" is the admission that it is not, and the user's
 * next action is physical rather than on screen. It has to sit above
 * `switchingTo` because the two are only distinguishable by time — a relay that
 * never opens looks exactly like one that has not opened yet, right up until it
 * is too late to matter.
 */
test('a stuck relay outranks a command in flight', () => {
  const result = resolveOutletBadge({
    isOn: false,
    isDrawing: true,
    telemetryFresh: true,
    switchingTo: 'off',
    relayStuck: true,
  });

  assert.equal(result.text, 'Will not switch off');
  assert.equal(result.tone, 'danger');
});

test('a stuck relay is reported even while telemetry is stale', () => {
  // The fault was confirmed from readings that have since stopped arriving. The
  // outlet did not become safe when the ESP32 went quiet.
  const result = resolveOutletBadge({
    isOn: false,
    isDrawing: false,
    telemetryFresh: false,
    relayStuck: true,
  });

  assert.equal(result.tone, 'danger');
});

test('no other combination produces the danger tone', () => {
  [true, false].forEach((isOn) =>
    [true, false].forEach((isDrawing) =>
      [true, false].forEach((telemetryFresh) =>
        [null, 'on', 'off'].forEach((switchingTo) => {
          const result = resolveOutletBadge({
            isOn,
            isDrawing,
            telemetryFresh,
            switchingTo,
            relayStuck: false,
          });
          assert.notEqual(result.tone, 'danger');
        })
      )
    )
  );
});
