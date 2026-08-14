import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import { getStatusColor } from '../src/screens/PowerSafetyManagement/utils/safetyHelpers.js';

/*
 * `getStatusColor` grades the chips that sit directly beneath the banner
 * `evaluateSafety` grades. Two rules describing one reading is the arrangement
 * that produced both bugs below, so the ratios are now duplicated from the
 * backend rather than invented here — the same deliberate duplication as
 * billing.js, and it needs the same guard.
 *
 * The phone has no runner that reaches this file, so the guard lives here.
 */
const BACKEND = 'C:/App/WattWise/functions/src/lib/powerSafety.js';

const VOLTAGE = { min: 200, max: 250 };
const POWER = { max: 500 };

test('mains voltage reads Normal — it is not approaching anything', () => {
  /*
   * The regression. This used to warn above `max * 0.95`, putting Normal at
   * 210-237.5 V on a 200-250 band. Philippine mains sits at 240-250, so the
   * owner's 245.3 V and 245.7 V both showed Warning, and would have on
   * essentially every reading forever - beneath a banner reading "Normal · All
   * systems operating within safe parameters".
   *
   * A warning that cannot turn off trains the user to ignore the one element
   * meant to catch a real problem. Same argument as the 5% accuracy band.
   */
  assert.equal(getStatusColor(245.3, VOLTAGE).label, 'Normal');
  assert.equal(getStatusColor(245.7, VOLTAGE).label, 'Normal');

  // The whole band, in and out. No margin either side: evaluateSafety treats
  // voltage as strictly in-band or out, and escalates over-voltage to 'limit'
  // rather than 'cutoff' because opening the relay does not fix a supply fault.
  assert.equal(getStatusColor(200, VOLTAGE).label, 'Normal');
  assert.equal(getStatusColor(250, VOLTAGE).label, 'Normal');
  assert.equal(getStatusColor(199.9, VOLTAGE).label, 'Critical');
  assert.equal(getStatusColor(250.1, VOLTAGE).label, 'Critical');
});

test('power is graded on the backend ratios, not a second opinion', () => {
  // The same contradiction pointed the other way: this file used to warn at 0.9
  // while evaluateSafety escalates at 0.8, so a 425 W draw showed a Normal chip
  // under a Warning banner.
  assert.equal(getStatusColor(425, POWER).label, 'Warning'); // 0.85
  assert.equal(getStatusColor(399, POWER).label, 'Normal'); // just under 0.8
  assert.equal(getStatusColor(400, POWER).label, 'Warning'); // exactly 0.8
  assert.equal(getStatusColor(475, POWER).label, 'Critical'); // exactly 0.95
  assert.equal(getStatusColor(520, POWER).label, 'Critical');
});

test('a missing or zero ceiling does not divide by zero', () => {
  // thresholds fall back to placeholder shapes when the safety document cannot
  // be read, and a NaN ratio silently grades everything Normal.
  assert.equal(getStatusColor(300, { max: 0 }).label, 'Normal');
  assert.equal(getStatusColor(300, {}).label, 'Normal');
});

test('the ratios still match the backend they were copied from', { skip: !existsSync(BACKEND) }, () => {
  /*
   * Three copies of the tariff already have to agree; this is the second figure
   * with that property. Read the real source rather than trusting the comment
   * pointing at it.
   *
   * Skips when the phone repo is not on disk - CI, or Vercel's build. A missing
   * sibling checkout is not a drift signal, and a test that fails for being
   * unable to look is one people learn to ignore.
   */
  const source = readFileSync(BACKEND, 'utf8');

  const warning = source.match(/const WARNING_RATIO\s*=\s*([\d.]+)/);
  const limit = source.match(/const LIMIT_RATIO\s*=\s*([\d.]+)/);

  assert.ok(warning && limit, 'WARNING_RATIO / LIMIT_RATIO not found — powerSafety.js was restructured');

  const warningRatio = Number(warning[1]);
  const limitRatio = Number(limit[1]);

  // Probed through the public function rather than by re-reading our own
  // constants, so this fails if the grading drifts by any route.
  const max = POWER.max;
  assert.equal(getStatusColor(max * warningRatio, POWER).label, 'Warning');
  assert.equal(getStatusColor(max * warningRatio - 1, POWER).label, 'Normal');
  assert.equal(getStatusColor(max * limitRatio, POWER).label, 'Critical');
  assert.equal(getStatusColor(max * limitRatio - 1, POWER).label, 'Warning');
});
