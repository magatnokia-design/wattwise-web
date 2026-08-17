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
  // Required since the phone's 988f5fa: `isDrawing` is now
  // `hasReading && powerW > floor`, so an outlet with no telemetry timestamp
  // reads as drawing nothing however much power the document claims. Every
  // fixture here is meant to be a live outlet unless it says otherwise.
  metricsUpdatedAtMs: NOW,
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
  /*
   * DashboardPage calls buildLiveAppliances(outlets, {}) with no clock, so the
   * default has to serve two comparisons now, not one: the pending window, and
   * the telemetry freshness `isDrawing` gained in the phone's 988f5fa. Both
   * timestamps are real-clock here for that reason - the fixed NOW the rest of
   * this file uses would read as telemetry from months ago.
   */
  const realNow = Date.now();
  const appliance = buildLiveAppliances(
    [outlet({
      status: 'off',
      metricsUpdatedAtMs: realNow,
      pendingStatus: 'off',
      pendingStatusUntilMs: realNow + 5000,
    })],
    {}
  )[0];

  assert.equal(appliance.isDrawing, true);
  assert.equal(appliance.isSwitching, true);
  assert.equal(appliance.switchingTo, 'off');
});

test('a frozen power field cannot report a transition that already ended', () => {
  /*
   * This was a local gate in DashboardPage until the phone's 988f5fa moved it
   * into `isDrawing`, so the test moves here with it — the behaviour is now the
   * shared file's to keep, and this is where a re-sync that drops it gets caught.
   *
   * `isSwitchingOff` is `!isOn && isDrawing`, and `power` freezes at its last
   * value when the ESP32 stops posting. An outlet commanded off while a fan ran
   * therefore reported "Switching off…" against a 27-second-old wattage and
   * would have said it forever. It also had a cost beyond the wording: it is
   * what convinced the owner a countdown timer had failed when it had fired
   * correctly.
   */
  const frozen = first([
    outlet({ status: 'off', power: 57.2, current: 0.24, metricsUpdatedAtMs: NOW - 27_000 }),
  ]);

  assert.equal(frozen.hasReading, false);
  assert.equal(frozen.isDrawing, false);
  assert.equal(frozen.isSwitching, false);
  assert.equal(frozen.switchingTo, null);
  // The command itself is still known — only the meter went quiet.
  assert.equal(frozen.isOn, false);
});

test('hasReading separates "nothing is drawing" from "we cannot see"', () => {
  // Collapsed together the two always read as the confident one, which is the
  // whole family of bugs this pair exists to end.
  assert.equal(first([outlet()]).hasReading, true);
  assert.equal(first([outlet({ power: 0, current: 0 })]).hasReading, true);
  assert.equal(first([outlet({ metricsUpdatedAtMs: NOW - 13_000 })]).hasReading, false);
  assert.equal(first([outlet({ metricsUpdatedAtMs: 0 })]).hasReading, false);
});

test('currentPower is gone', () => {
  // Removed with its last consumer; asserted so a re-sync that reintroduces it
  // is noticed rather than silently carried.
  const appliance = first([outlet()]);
  assert.equal('currentPower' in appliance, false);
});

test('isOn reports the command and does not decay with the readings', () => {
  /*
   * The Dashboard leans on this. useOutletControl forces status to false when
   * telemetry is stale, which made resolveOutletBadge's "On · no reading" branch
   * unreachable - the card's telemetryFresh IS that flag, so !telemetryFresh
   * implied !isOn and the badge could only ever say "Off".
   *
   * The fallback is this helper, and it is only sound because status is the
   * *commanded* state: processOutletToggle writes it, the ESP32 acks it, and it
   * lives in Firestore whether or not the hardware is talking. Nothing here may
   * ever gate it on a timestamp. Reported as §0y.2.
   */
  const stale = first([
    outlet({
      status: 'on',
      power: 0,
      current: 0,
      metricsUpdatedAtMs: NOW - 10 * 60 * 1000,
    }),
  ]);

  assert.equal(stale.isOn, true);
  // And the meter is still allowed to disagree - that pairing is the point.
  assert.equal(stale.isDrawing, false);

  const off = first([outlet({ status: 'off', metricsUpdatedAtMs: NOW - 10 * 60 * 1000 })]);
  assert.equal(off.isOn, false);
});

/*
 * Two outlets can carry the same appliance name, and one did: both sockets were
 * confirmed as "LED Lamp", after which Analytics printed "LED Lamp · 15.2 W"
 * beside a dashboard that said "Detecting..." about the same outlet, and every
 * row of the activity log became indistinguishable from every other.
 *
 * The grouping key must stay a bare name - the daily rollup sums energy per
 * appliance and today's live entry has to key the way yesterday's stored one
 * did - so the slot qualifier belongs on a separate display field.
 */
test('a live row is identified by its slot, not only by its name', () => {
  const [one, two] = buildLiveAppliances(
    [
      outlet({ outletNumber: 1, applianceName: 'LED Lamp', power: 15.2 }),
      outlet({ outletNumber: 2, applianceName: 'LED Lamp', power: 14.0 }),
    ],
    { nowMs: NOW }
  );

  assert.equal(one.displayLabel, 'Outlet 1 · LED Lamp');
  assert.equal(two.displayLabel, 'Outlet 2 · LED Lamp');
  assert.notEqual(one.displayLabel, two.displayLabel);

  // The rollup key stays bare, so the two still sum into one appliance total.
  assert.equal(one.applianceName, 'LED Lamp');
  assert.equal(two.applianceName, 'LED Lamp');
});

test('an unnamed outlet is not labelled twice', () => {
  const [one] = buildLiveAppliances([outlet({ outletNumber: 1 })], { nowMs: NOW });

  assert.equal(one.displayLabel, 'Outlet 1');
});
