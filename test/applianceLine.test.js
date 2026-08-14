import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApplianceLine, isDrawingPower } from '../src/components/dashboard/applianceLine.js';

test('residual current on a switched-off outlet is not a load', () => {
  /*
   * The regression. useOutletControl's hasLiveLoad is
   * `power >= 0.5 || current >= 0.01`, and this PZEM's residual on a
   * switched-off outlet reads 0.02 A at 0.0 W - double that threshold with
   * nothing consuming. Observed as "Nokia's Fan · recognised" under an outlet
   * that was off, and it came and went exactly as the current flickered
   * 0.02 -> 0.00 -> 0.02.
   *
   * Real power is the only thing that means consumption.
   */
  assert.equal(isDrawingPower({ power: 0, current: 0.02 }), false);
  assert.equal(isDrawingPower({ power: 0, current: 0.03 }), false);

  assert.equal(isDrawingPower({ power: 57.2, current: 0.24 }), true);
});

test('the power floor rejects meter noise but not a small real load', () => {
  assert.equal(isDrawingPower({ power: 0.5 }), false);
  assert.equal(isDrawingPower({ power: 0.6 }), true);
  // A phone charger sits at the bottom of the catalogue and must still count.
  assert.equal(isDrawingPower({ power: 3 }), true);
});

test('missing or malformed metrics are not a load', () => {
  assert.equal(isDrawingPower(undefined), false);
  assert.equal(isDrawingPower({}), false);
  assert.equal(isDrawingPower({ power: null }), false);
  assert.equal(isDrawingPower({ power: 'abc' }), false);
});

const line = (args) => resolveApplianceLine({ isDrawing: true, applianceName: '', identity: null, ...args });

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
    identity: { state: 'changed', namedAs: 'LED LAMP', unsupported: true },
  });

  assert.equal(result.text, 'Not something WattWise monitors');
  assert.equal(result.tone, 'unsupported');
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
  const result = line({ applianceName: '', identity: { state: 'unnamed', namedAs: '', unsupported: true } });
  assert.equal(result.text, 'Not something WattWise monitors');
});
