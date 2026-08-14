import test from 'node:test';
import assert from 'node:assert/strict';

import { getSafetyStageConfig } from '../src/screens/PowerSafetyManagement/utils/safetyHelpers.js';

/*
 * This began as a local module here and was taken into the copy-rule file by the
 * phone's 91a5925, so the test moved onto the shared function rather than being
 * deleted with the module. The phone has no runner that can reach this file;
 * `node --test` can, so this is the cheaper home for it - same arrangement as
 * liveUsage.test.js.
 */

test('a stale device is not graded at all', () => {
  /*
   * The regression, and the worst-placed instance of the pattern so far.
   *
   * getSafetyStageConfig ends `configs[stage] || configs.normal`, so a stage
   * read from a document the hardware stopped updating rendered the largest,
   * greenest element on the page as "All systems operating within safe
   * parameters". With the ESP32 unplugged the owner's screen said, at once: six
   * chips "No reading", both outlet cards "Waiting for the ESP32 to report", and
   * the banner that everything was safe.
   *
   * "Normal" is not the safe default when nothing is being measured. It is the
   * most dangerous one, because this banner is the single element a user reads
   * to decide whether anything is wrong.
   */
  const stale = getSafetyStageConfig('normal', true);

  assert.equal(stale.label, 'No readings');
  assert.notEqual(stale.label, 'Normal');
  assert.ok(!/within safe parameters/i.test(stale.description));
  assert.equal(stale.stale, true);
});

test('staleness outranks every stage, including a cut-off', () => {
  // Whatever the document last said, it is a verdict on readings that have
  // stopped. None of them may survive that.
  ['normal', 'warning', 'limit', 'cutoff', 'nonsense', undefined].forEach((stage) => {
    const result = getSafetyStageConfig(stage, true);
    assert.equal(result.label, 'No readings', `stage ${stage} leaked through`);
  });
});

test('a reporting device is graded exactly as before', () => {
  assert.equal(getSafetyStageConfig('normal').label, 'Normal');
  assert.equal(getSafetyStageConfig('warning').label, 'Warning');
  assert.equal(getSafetyStageConfig('limit').label, 'Limit Reached');
  assert.equal(getSafetyStageConfig('cutoff').label, 'Cut-off Active');

  // Second argument defaults to false, so existing call sites are unaffected.
  assert.equal(getSafetyStageConfig('cutoff', false).label, 'Cut-off Active');
});

test('an unknown stage on a live device still falls back to normal', () => {
  // The fallback is right for its own job; it was only ever wrong about
  // staleness, which is now a separate input.
  assert.equal(getSafetyStageConfig('nonsense').label, 'Normal');
  assert.equal(getSafetyStageConfig(undefined).label, 'Normal');
});

test('every stage returns the four fields the banner renders', () => {
  ['normal', 'warning', 'limit', 'cutoff'].forEach((stage) => {
    [true, false].forEach((isStale) => {
      const result = getSafetyStageConfig(stage, isStale);

      ['label', 'description', 'color', 'bgColor'].forEach((field) => {
        assert.ok(result[field], `${stage}/${isStale} missing ${field}`);
      });
    });
  });
});
