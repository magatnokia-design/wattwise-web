import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import {
  DETECTABLE_APPLIANCES,
  OUTLET_LIMIT_W,
  COMBINED_LIMIT_W,
} from '../src/components/settings/applianceCatalogue.js';

/*
 * The Settings reference hand-copies the catalogue out of the phone repo, which
 * is the same arrangement that let OnboardingScreen.js drift to 7 appliances
 * with three renamed while the detector had 8. This is the guard the phone repo
 * added for their copy, pointed at ours.
 *
 * Same approach as their billingParity.test.js: read the real source, compare.
 *
 * When the phone repo is not on disk - CI, or Vercel's build - these skip
 * rather than fail. A missing sibling checkout is not a drift signal, and a
 * test that fails for being unable to look is a test people learn to ignore.
 */
const DETECTOR = 'C:/App/WattWise/functions/src/lib/applianceDetector.js';
const FIRMWARE = 'C:/App/WattWise/docs/esp32/WattWise_ESP32_Relay_Cloud/WattWise_ESP32_Relay_Cloud.ino';

const readIfPresent = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

test('the appliance list matches the detector, in order', { skip: !existsSync(DETECTOR) }, () => {
  const source = readIfPresent(DETECTOR);

  // Only the labels inside APPLIANCE_PROFILES - the learned-signature code below
  // it builds labels too, so the slice is bounded to the array literal.
  const start = source.indexOf('const APPLIANCE_PROFILES');
  assert.ok(start > -1, 'APPLIANCE_PROFILES not found - the detector was restructured');

  const end = source.indexOf('];', start);
  const catalogue = source.slice(start, end);

  const labels = [...catalogue.matchAll(/label:\s*'([^']+)'/g)].map((match) => match[1]);

  assert.deepEqual(
    DETECTABLE_APPLIANCES.map((appliance) => appliance.name),
    labels,
    'Settings → Supported appliances has drifted from the detector catalogue'
  );
});

test('the stated limits match the firmware', { skip: !existsSync(FIRMWARE) }, () => {
  const source = readIfPresent(FIRMWARE);

  const outlet = source.match(/MAX_OUTLET_POWER_W\s*=\s*([\d.]+)f?/);
  const total = source.match(/MAX_TOTAL_POWER_W\s*=\s*([\d.]+)f?/);

  assert.ok(outlet && total, 'power limits not found in the firmware');
  assert.equal(Number(outlet[1]), OUTLET_LIMIT_W);
  assert.equal(Number(total[1]), COMBINED_LIMIT_W);
});

test('every entry has a name and a wattage range', () => {
  // Runs everywhere, including where the phone repo is absent.
  assert.ok(DETECTABLE_APPLIANCES.length > 0);

  DETECTABLE_APPLIANCES.forEach((appliance) => {
    assert.equal(typeof appliance.name, 'string');
    assert.ok(appliance.name.length > 0);
    assert.match(appliance.typical, /^\d+–\d+ W$/, `${appliance.name} has a malformed range`);
  });
});
