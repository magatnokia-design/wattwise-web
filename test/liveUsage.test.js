import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiveAppliances } from '../src/utils/liveUsage.js';

/*
 * `liveUsage.js` is a copy-rule file — byte-identical to the phone app's. These
 * tests are the web repo's contribution to a file neither repo could exercise:
 * the phone has no frontend test runner, so the `nowMs` injection added for
 * testability was shipped unexercised. Node's built-in runner needs no
 * dependency, so this is the cheaper home for it.
 *
 * If a change here fails, the answer is almost never to edit `liveUsage.js`
 * locally — re-sync from `C:\App\WattWise` and check whether the behaviour
 * changed on purpose.
 */

const NOW = 1_760_000_000_000;

const outlet = (overrides = {}) => ({
  outletNumber: 1,
  status: 'on',
  power: 52.6,
  current: 0.23,
  energy: 0.4,
  ...overrides,
});

const first = (outlets, options = {}) =>
  buildLiveAppliances(outlets, { nowMs: NOW, ...options })[0];

test('a live draw is drawing, and not switching', () => {
  const appliance = first([outlet()]);

  assert.equal(appliance.isDrawing, true);
  assert.equal(appliance.isOn, true);
  assert.equal(appliance.isSwitching, false);
  assert.equal(appliance.switchingTo, null);
});

test('commanded off while still drawing reports switching off', () => {
  // The window this whole mechanism exists for: the callable has already written
  // status 'off', the ESP32 has not polled, the relay is still closed and the
  // PZEM still reads 52.6 W.
  const appliance = first([
    outlet({ status: 'off', pendingStatus: 'off', pendingStatusUntilMs: NOW + 5000 }),
  ]);

  assert.equal(appliance.isSwitching, true);
  assert.equal(appliance.switchingTo, 'off');
  // Meter-only: the outlet is genuinely still consuming, whatever it was told.
  assert.equal(appliance.isDrawing, true);
  assert.equal(appliance.isOn, false);
});

test('commanded on while still drawing nothing reports switching on', () => {
  const appliance = first([
    outlet({
      status: 'on',
      power: 0,
      current: 0,
      pendingStatus: 'on',
      pendingStatusUntilMs: NOW + 5000,
    }),
  ]);

  assert.equal(appliance.isSwitching, true);
  assert.equal(appliance.switchingTo, 'on');
  assert.equal(appliance.isDrawing, false);
});

test('a command the meter already agrees with is not switching', () => {
  // Told to come on and already drawing - there is nothing left to wait for.
  const agreed = first([
    outlet({ status: 'on', pendingStatus: 'on', pendingStatusUntilMs: NOW + 5000 }),
  ]);
  assert.equal(agreed.isSwitching, false);
  assert.equal(agreed.switchingTo, null);

  // Told to go off and already at zero - likewise.
  const settled = first([
    outlet({
      status: 'off',
      power: 0,
      current: 0,
      pendingStatus: 'off',
      pendingStatusUntilMs: NOW + 5000,
    }),
  ]);
  assert.equal(settled.isSwitching, false);
  assert.equal(settled.switchingTo, null);
});

test('an expired pending window still governs the `on` direction', () => {
  // This is what nowMs was made injectable for - without it the case can only be
  // reached by waiting on the wall clock.
  const appliance = first([
    outlet({ status: 'on', power: 0, current: 0, pendingStatus: 'on', pendingStatusUntilMs: NOW - 1 }),
  ]);

  assert.equal(appliance.isSwitching, false);
  assert.equal(appliance.switchingTo, null);
});

test('off while drawing is switching off with no pending marker at all', () => {
  /*
   * Changed deliberately in the phone's b90e529, so this test moved with it
   * rather than being a local expectation to defend.
   *
   * It used to require a live pending window, which an auto-cutoff never opens -
   * updateOutletMetrics references pendingStatus only to delete it. The result
   * was a dashboard reading "Off" beside 1030 W. Current running through an
   * outlet the document calls off cannot be a resting state whatever caused it,
   * so the contradiction alone is now the signal.
   */
  const cutoff = first([outlet({ status: 'off', power: 1030, current: 4.31 })]);

  assert.equal(cutoff.isSwitching, true);
  assert.equal(cutoff.switchingTo, 'off');
  assert.equal(cutoff.isDrawing, true);

  // And an expired window no longer suppresses it either.
  const expired = first([
    outlet({ status: 'off', pendingStatus: 'off', pendingStatusUntilMs: NOW - 1 }),
  ]);
  assert.equal(expired.switchingTo, 'off');
});

test('sensor noise below the floor is not a load', () => {
  const appliance = first([outlet({ power: 0.4, current: 0.001 })]);
  assert.equal(appliance.isDrawing, false);
});

test('nowMs defaults to the clock when the caller passes nothing', () => {
  // DashboardPage calls buildLiveAppliances(outlets, {}) with no clock, which
  // must still resolve a live pending window.
  const appliance = buildLiveAppliances(
    [outlet({ status: 'off', pendingStatus: 'off', pendingStatusUntilMs: Date.now() + 5000 })],
    {}
  )[0];

  assert.equal(appliance.isSwitching, true);
  assert.equal(appliance.switchingTo, 'off');
});

test('currentPower is gone', () => {
  // Removed with its last consumer; asserted so a re-sync that reintroduces it
  // is noticed rather than silently carried.
  const appliance = first([outlet()]);
  assert.equal('currentPower' in appliance, false);
});
