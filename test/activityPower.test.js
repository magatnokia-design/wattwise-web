import assert from 'node:assert/strict';
import test from 'node:test';

import { formatWatts, powerAtSwitch } from '../src/screens/History/utils/historyHelpers.js';

/*
 * The POWER column looked arbitrary: some ON rows carried a wattage and some did
 * not, with no rule a user could infer. The cause was that `power` held the last
 * telemetry, and after a switch-off the device has not posted a zero yet - so a
 * quick off-then-on logged the *previous* session's draw against the switch-on.
 * Whether it landed depended on whether telemetry arrived between the two
 * toggles, which is a race.
 */

test('a switch-off reports the draw measured just before it', () => {
  assert.equal(powerAtSwitch({ status: 'OFF', power: 61.2 }), 61.2);
});

test('a switch-on reports nothing, even when the document carries a figure', () => {
  // The exact regression from the screenshots: off at 15.2 W, on again seconds
  // later, and the switch-on had claimed 14.9 W.
  assert.equal(powerAtSwitch({ status: 'ON', power: 14.9 }), 0);
});

test('the ON check is not case- or whitespace-sensitive', () => {
  assert.equal(powerAtSwitch({ status: 'on', power: 14.9 }), 0);
  assert.equal(powerAtSwitch({ status: ' On ', power: 14.9 }), 0);
});

test('an off with nothing drawing is zero, not a stale reading', () => {
  assert.equal(powerAtSwitch({ status: 'OFF', power: 0 }), 0);
});

test('missing or unparseable values fall to zero rather than NaN', () => {
  assert.equal(powerAtSwitch({ status: 'OFF' }), 0);
  assert.equal(powerAtSwitch({ status: 'OFF', power: null }), 0);
  assert.equal(powerAtSwitch({ status: 'OFF', power: 'n/a' }), 0);
  assert.equal(powerAtSwitch({}), 0);
  assert.equal(powerAtSwitch(), 0);
});

test('a negative reading is not rendered as a negative wattage', () => {
  assert.equal(powerAtSwitch({ status: 'OFF', power: -3 }), 0);
});

test('numeric strings from older documents still resolve', () => {
  assert.equal(powerAtSwitch({ status: 'OFF', power: '48.5' }), 48.5);
});

test('every zero renders as a dash, so the column never shows a bare 0 W', () => {
  // formatWatts returns '' below zero, and the table falls back to an em dash.
  assert.equal(formatWatts(powerAtSwitch({ status: 'ON', power: 14.9 })), '');
  assert.equal(formatWatts(powerAtSwitch({ status: 'OFF', power: 0 })), '');
  assert.equal(formatWatts(powerAtSwitch({ status: 'OFF', power: 61.2 })), '61.2 W');
});
