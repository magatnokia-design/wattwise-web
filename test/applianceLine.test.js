import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApplianceLine } from '../src/components/dashboard/applianceLine.js';

/*
 * `isDrawing` now arrives from useOutletControl's hasLoad rather than being
 * re-derived here from real power. The residual-current case those derivation
 * tests covered - this PZEM reads 0.02 A at 0.0 W on a switched-off outlet,
 * double the old `current >= 0.01` term, which put "Nokia's Fan · recognised"
 * under an outlet that was off - is fixed at the source in the phone's b90e529
 * and guarded by their tests. Re-testing a value this file no longer computes
 * would assert nothing.
 */
const line = (args) =>
  resolveApplianceLine({
    isDrawing: true,
    telemetryFresh: true,
    applianceName: '',
    identity: null,
    ...args,
  });

test('no readings never claims the outlet is empty, or that it is running', () => {
  /*
   * Both inputs freeze at the last snapshot when the ESP32 stops posting:
   * hasLoad is computed inside the snapshot handler and applianceIdentity
   * arrives with it. So a fan behind dropped wi-fi held "Nokia's Fan ·
   * recognised" indefinitely, on readings minutes old.
   *
   * The fix must not overshoot in the other direction either. Falling through
   * to "No appliance detected yet" would assert the outlet is empty, which is
   * equally unsupported - it is the same error the badge made as "On, idle".
   */
  const running = line({
    telemetryFresh: false,
    isDrawing: true,
    applianceName: "Nokia's Fan",
    identity: { state: 'confirmed', namedAs: "Nokia's Fan", recognised: true },
  });

  assert.equal(running.text, 'No recent readings');
  assert.notEqual(running.text, "Nokia's Fan · recognised");
  assert.notEqual(running.text, 'No appliance detected yet');

  // Frozen the other way: last snapshot said nothing was drawing.
  const quiet = line({ telemetryFresh: false, isDrawing: false, applianceName: "Nokia's Fan" });
  assert.equal(quiet.text, 'No recent readings');
});

test('no readings outranks an unsupported verdict', () => {
  // "Not something WattWise monitors" is a conclusion drawn from readings, so
  // it cannot outlive them.
  const result = line({
    telemetryFresh: false,
    scope: { unsupported: true, unsupportedReason: 'no_match' },
  });

  assert.equal(result.text, 'No recent readings');
});

test('nothing drawing reports nothing, even on a named outlet', () => {
  const result = line({ isDrawing: false, applianceName: "Nokia's Fan", identity: { state: 'confirmed', namedAs: "Nokia's Fan" } });

  assert.equal(result.text, 'No appliance detected yet');
  assert.equal(result.tone, 'idle');
});

test('the hair dryer: a fresh run does not inherit the last one\'s name', () => {
  /*
   * The regression. updateOutletMetrics DELETES applianceIdentity when a run
   * starts, so a previous "confirmed" cannot vouch for whatever got plugged in
   * next. A fallback meant for documents predating the field printed the stored
   * name anyway, so a 345 W hair dryer read "Nokia's Fan" for a minute.
   */
  const result = line({ applianceName: "Nokia's Fan", identity: null });

  assert.equal(result.text, 'Detecting…');
  assert.notEqual(result.text, "Nokia's Fan");
});

test('a confirmed match reports the name', () => {
  const result = line({
    applianceName: "Nokia's Fan",
    identity: { state: 'confirmed', namedAs: "Nokia's Fan", recognised: false },
  });

  assert.equal(result.text, "Nokia's Fan");
  assert.equal(result.tone, 'named');
});

test('a recognised match says so', () => {
  const result = line({
    applianceName: "Nokia's Fan",
    identity: { state: 'confirmed', namedAs: "Nokia's Fan", recognised: true },
  });

  assert.equal(result.text, "Nokia's Fan · recognised");
});

test('a contradicted name is doubted, not replaced', () => {
  const result = line({
    applianceName: 'LED LAMP',
    identity: { state: 'changed', namedAs: 'LED LAMP' },
  });

  assert.equal(result.text, 'Not LED LAMP');
  assert.equal(result.tone, 'changed');
});

test('unsupported outranks changed', () => {
  // Both say the stored name is wrong; only one says why, and "Not X" invites
  // the user to pick a replacement that is not in the catalogue.
  const result = line({
    applianceName: 'LED LAMP',
    identity: { state: 'changed', namedAs: 'LED LAMP' },
    scope: { unsupported: true, unsupportedReason: 'no_match' },
  });

  assert.equal(result.text, 'Not something WattWise monitors');
  assert.equal(result.tone, 'unsupported');
});

test('applianceIdentity.unsupported is ignored — it is the wrong source', () => {
  /*
   * Not defensive redundancy; deliberately dropped in favour of the suggestion's
   * scope fields, which the phone's 5073396 carries through every early return.
   *
   * Keeping identity as a fallback would have looked harmless and been the same
   * class of mistake as the hair-dryer fallback: a second source that agrees
   * with the first in every case it can see, and is silently absent in the one
   * that matters. For `no_match` both are true, so it adds nothing; for
   * `over_power` the identity is false or missing entirely, so it answers wrong.
   */
  const result = line({
    applianceName: 'LED LAMP',
    identity: { state: 'changed', namedAs: 'LED LAMP', unsupported: true },
    scope: { unsupported: false },
  });

  assert.equal(result.text, 'Not LED LAMP');
  assert.equal(result.tone, 'changed');
});

test('an over-power load says it draws too much, with the wattage', () => {
  /*
   * Newly reachable since the phone's 988f5fa. Until then `unsupported` could
   * never fire above 500 W at all: the firmware posts every 1500 ms and cuts
   * after 3000 ms, so an over-limit run produced two samples where the detector
   * needs four, and it returned before reaching the catalogue check. It is now
   * set from the over-power path instead, independent of the detector.
   *
   * "Not recognised" would be the wrong message for it. That invites the user to
   * try again, and trying again with a kettle will not help.
   */
  const result = line({
    applianceName: '',
    identity: null,
    scope: { unsupported: true, unsupportedReason: 'over_power', measuredPowerW: 912.4 },
  });

  assert.equal(result.text, 'Draws more than WattWise supports · 912 W');
  assert.equal(result.tone, 'unsupported');
});

test('over-power survives an absent identity, which is its normal state', () => {
  /*
   * The trap. `applianceIdentity.unsupported` comes from
   * `buildApplianceIdentity`, which derives it from `detection.unsupported` -
   * and the detector never sets that when the load was rejected on wattage
   * alone. The identity may not be written at all, since matchNamedAppliance
   * needs an evaluated state.
   *
   * Reading only applianceIdentity here left a 900 W kettle on "Detecting…"
   * until it was unplugged, which is the exact silence §0u.1 was raised to end.
   */
  const result = line({
    applianceName: "Nokia's Fan",
    identity: null,
    scope: { unsupported: true, unsupportedReason: 'over_power', measuredPowerW: 900 },
  });

  assert.notEqual(result.text, 'Detecting…');
  assert.equal(result.tone, 'unsupported');
});

test('no_match keeps the original wording, and a missing wattage does not print NaN', () => {
  const noMatch = line({
    scope: { unsupported: true, unsupportedReason: 'no_match' },
  });
  assert.equal(noMatch.text, 'Not something WattWise monitors');

  // measuredPowerW is only written on the over-power case, so the other branch
  // must not assume it.
  const noWatts = line({
    scope: { unsupported: true, unsupportedReason: 'over_power' },
  });
  assert.equal(noWatts.text, 'Draws more than WattWise supports');
  assert.ok(!/NaN|undefined/.test(noWatts.text));
});

test('out of scope still ranks under a telemetry gap', () => {
  // It is a conclusion drawn from readings, so it cannot outlive them.
  const result = line({
    telemetryFresh: false,
    scope: { unsupported: true, unsupportedReason: 'over_power', measuredPowerW: 912 },
  });

  assert.equal(result.text, 'No recent readings');
});

test('a verdict about a name the outlet no longer wears is not used', () => {
  // Accepting a suggestion renames the outlet immediately, but the stored
  // verdict still describes the old name until the next evaluation. This is
  // what briefly rendered "Not Speaker" one second after choosing Speaker.
  const result = line({
    applianceName: 'Speaker',
    identity: { state: 'changed', namedAs: 'LED LAMP' },
  });

  assert.equal(result.text, 'Detecting…');
});

test('name comparison ignores case and surrounding space', () => {
  const result = line({
    applianceName: "  nokia's fan ",
    identity: { state: 'confirmed', namedAs: "Nokia's Fan", recognised: false },
  });

  assert.equal(result.tone, 'named');
});

test('an unnamed outlet mid-run is still detecting', () => {
  const result = line({ applianceName: '', identity: { state: 'unnamed', namedAs: '' } });
  assert.equal(result.text, 'Detecting…');
});

test('unsupported wins even before the outlet has a name', () => {
  // The usual case, in fact: an out-of-scope verdict arrives precisely when
  // there is no name, no candidates and no identity to go with it.
  const result = line({
    applianceName: '',
    identity: { state: 'unnamed', namedAs: '' },
    scope: { unsupported: true, unsupportedReason: 'no_match' },
  });

  assert.equal(result.text, 'Not something WattWise monitors');
});
