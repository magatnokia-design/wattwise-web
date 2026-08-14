import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSafetyStage, NO_READING_STAGE } from '../src/components/safety/safetyStage.js';
import { getSafetyStageConfig } from '../src/screens/PowerSafetyManagement/utils/safetyHelpers.js';

test('nothing reporting is not graded normal', () => {
  /*
   * The regression, observed with the ESP32 unplugged: the banner read "Normal ·
   * All systems operating within safe parameters" above six chips all reading
   * "No reading" and two cards saying "Waiting for the ESP32 to report".
   *
   * The worst-placed instance of this pattern so far, because the safety banner
   * is the one element a user reads to decide whether something is wrong.
   */
  const result = resolveSafetyStage({
    stageConfig: getSafetyStageConfig('normal'),
    telemetryFresh: false,
  });

  assert.equal(result.label, 'No readings');
  assert.notEqual(result.label, 'Normal');
  assert.notEqual(result.description, 'All systems operating within safe parameters');
});

test('a stale cut-off is not graded either', () => {
  // Works both ways: an alarming stage is equally unsupported once the readings
  // behind it have stopped, and leaving it up would train users to ignore it.
  const result = resolveSafetyStage({
    stageConfig: getSafetyStageConfig('cutoff'),
    telemetryFresh: false,
  });

  assert.equal(result, NO_READING_STAGE);
});

test('with readings arriving, the shared config is passed through untouched', () => {
  ['normal', 'warning', 'limit', 'cutoff'].forEach((stage) => {
    const config = getSafetyStageConfig(stage);
    const result = resolveSafetyStage({ stageConfig: config, telemetryFresh: true });

    assert.equal(result, config, `${stage} must not be rewritten while live`);
  });
});

test('the copy-rule fallback that made this reachable is still there', () => {
  /*
   * getSafetyStageConfig ends `configs[stage] || configs.normal`. That is right
   * for its own job - turning a stage string into a colour - but it means an
   * unknown or missing stage is indistinguishable from a measured, safe one.
   *
   * Asserted so that if the phone ever changes it, this guard is re-examined
   * rather than left in place out of habit.
   */
  assert.equal(getSafetyStageConfig(undefined).label, 'Normal');
  assert.equal(getSafetyStageConfig('nonsense').label, 'Normal');
});

test('the substitute carries every field the banner renders', () => {
  // The page spreads colour and text straight onto the element; a missing key
  // would render as an unstyled block rather than throw.
  ['label', 'description', 'color', 'bgColor'].forEach((key) => {
    assert.ok(NO_READING_STAGE[key], `NO_READING_STAGE.${key} is missing`);
  });
});
