import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateSupplyRates,
  PLAUSIBLE_BLOCK1_MIN,
  PLAUSIBLE_BLOCK1_MAX,
} from '../src/screens/Settings/utils/settingsHelpers.js';
import { SUPPLY_RATE_FIELDS } from '../src/utils/billing.js';

/*
 * The Settings rate editor is the one place a user can change what every peso
 * figure in the system means - dashboard estimate, daily rollups, budget, and
 * the accuracy check against a real PELCO bill all price against these eleven
 * numbers. The phone refused a bad generation rate; the web accepted anything
 * and reported success. These pin the shared rule both now use.
 */

const draft = (overrides = {}) =>
  SUPPLY_RATE_FIELDS.reduce((acc, field) => {
    acc[field.key] = String(field.defaultValue);
    return acc;
  }, { ...{} , ...{} , ...overrides });

// The owner's real July 2026 rates, which must pass untouched.
const REAL = {
  generation: '5.5034', generationRateAdj: '-0.0306',
  transmission: '0.5382', transmissionCostAdj: '0',
  ancillary: '0.8858', systemLoss: '0.5373', systemLossAdj: '0',
  transDemand: '0', transDemandAdj: '0', icera: '0', gram: '0',
};

test('a real bill’s rates validate cleanly', () => {
  const result = validateSupplyRates(REAL, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.warnings, []);
  assert.equal(result.total.toFixed(4), '7.4341');
});

test('a blank generation rate is refused, not silently defaulted', () => {
  // The quiet failure this exists for: normalizeSupplyRates reads blank as
  // "use the default", so saving would swap the user's own 5.5034 for the
  // seeded 6.5269 and report success.
  const result = validateSupplyRates({ ...REAL, generation: '' }, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, false);
  assert.match(result.errors.generation, /Enter the generation rate/);
});

test('a zero generation rate is refused', () => {
  // hasSupplyRates treats generation 0 as "nothing configured", so this does
  // not store a zero - it silently reverts the whole app to seeded defaults.
  const result = validateSupplyRates({ ...REAL, generation: '0' }, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, false);
  assert.match(result.errors.generation, /more than zero/);
});

test('letters are refused rather than becoming zero', () => {
  // Number('abc') is NaN and toNumber turns that into 0, which is the zero case
  // above wearing a disguise.
  const result = validateSupplyRates({ ...REAL, generation: 'abc' }, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, false);
  assert.match(result.errors.generation, /Numbers only/);
});

test('adjustment lines may be negative, because real bills credit them', () => {
  // The seeded Gen. Rate Adj is -0.0306 and appears negative on every bill.
  for (const key of ['generationRateAdj', 'transmissionCostAdj', 'systemLossAdj', 'transDemandAdj']) {
    const result = validateSupplyRates({ ...REAL, [key]: '-0.5' }, SUPPLY_RATE_FIELDS);
    assert.equal(result.valid, true, `${key} should accept a negative`);
  }
});

test('a negative on any other line is refused as a typo', () => {
  for (const key of ['generation', 'transmission', 'ancillary', 'systemLoss', 'icera', 'gram']) {
    const result = validateSupplyRates({ ...REAL, [key]: '-1' }, SUPPLY_RATE_FIELDS);
    assert.equal(result.valid, false, `${key} should refuse a negative`);
  }
});

test('a blank advanced line is allowed and counts as its default', () => {
  const cleared = validateSupplyRates({ ...REAL, icera: '', gram: '' }, SUPPLY_RATE_FIELDS);
  assert.equal(cleared.valid, true);
  // icera and gram both default to 0, so the total is unchanged.
  assert.equal(cleared.total.toFixed(4), '7.4341');
});

test('a misplaced decimal point is flagged but still saveable', () => {
  // The error that actually happens: 55.034 typed for 5.5034. Ten times the
  // tariff, no complaint from any other check in the system.
  const result = validateSupplyRates({ ...REAL, generation: '55.034' }, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, true, 'a warning must not block the save');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /misplaced decimal/);
  assert.ok(result.total > PLAUSIBLE_BLOCK1_MAX);
});

test('an implausibly low total is flagged too', () => {
  const result = validateSupplyRates({ ...REAL, generation: '0.55034' }, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, true);
  assert.equal(result.warnings.length, 1);
  assert.ok(result.total < PLAUSIBLE_BLOCK1_MIN);
});

test('no warning is raised while a field is still invalid', () => {
  // A total summed from fields that failed is not a total worth commenting on.
  const result = validateSupplyRates({ ...REAL, generation: '', ancillary: '900' }, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, false);
  assert.deepEqual(result.warnings, []);
});

test('every field key is covered, so a new tariff line cannot slip through', () => {
  const bad = SUPPLY_RATE_FIELDS.reduce((acc, field) => {
    acc[field.key] = 'not-a-number';
    return acc;
  }, {});
  const result = validateSupplyRates(bad, SUPPLY_RATE_FIELDS);
  assert.equal(result.valid, false);
  assert.equal(Object.keys(result.errors).length, SUPPLY_RATE_FIELDS.length);
});

test('the defaults themselves pass', () => {
  assert.equal(validateSupplyRates(draft(), SUPPLY_RATE_FIELDS).valid, true);
});
