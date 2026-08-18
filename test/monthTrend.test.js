import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTrend,
  compareMonths,
  previousMonthKey,
} from '../src/screens/ReferenceComparison/utils/comparisonHelpers.js';

/*
 * The comparison screen used to take two user-picked months, and the second
 * picker was the thing nobody could reason about: the PELCO bill card below it
 * followed only the *first* selection, so choosing a month in the second one
 * changed half the page and left the other half alone, with nothing marking the
 * boundary. Reported as "if I pick July, how is it comparing? August WattWise
 * and August actual vs July WattWise?" - which is exactly the ambiguity the
 * layout created.
 *
 * One month is picked now; the baseline is always the month before it. These
 * guard the two properties that make that safe to read: the baseline is derived
 * and never wanders, and an unmeasured baseline is reported as an absence
 * rather than as a measurement of zero.
 */

const withDays = (kWh, cost, days = 30) => ({
  kWh,
  cost,
  outlet1: kWh / 2,
  outlet2: kWh / 2,
  outlet1Name: 'Outlet 1',
  outlet2Name: 'Outlet 2',
  daysRecorded: days,
});

const nothing = withDays(0, 0, 0);

test('the baseline is the calendar month before, across a year boundary', () => {
  assert.equal(previousMonthKey('2026-08'), '2026-07');
  assert.equal(previousMonthKey('2026-01'), '2025-12');
});

test('an unmeasured previous month yields no comparison at all', () => {
  // The user's live case: August has 3.23 kWh recorded, July has nothing.
  const trend = buildTrend(compareMonths(withDays(3.23, 37.57), nothing), 'August 2026', 'July 2026');

  assert.equal(trend.available, false);
  assert.equal(trend.tone, 'neutral');
  // Never a percentage, an arrow, or a more/less claim - there is no baseline to
  // be more or less than. Rendering absence as a 100% rise off an unmeasured
  // zero is the same mistake as grading an unplugged outlet's 0.0 V.
  assert.equal(trend.headline, 'No July 2026 usage on record');
  assert.ok(!/%|↑|↓|\bmore\b|\bless\b/.test(trend.headline + trend.detail));
});

test('the no-baseline case points at the check that does work today', () => {
  const trend = buildTrend(compareMonths(withDays(3.23, 37.57), nothing), 'August 2026', 'July 2026');

  // Someone who just installed the hub cannot have two measured months, so
  // stating the requirement and stopping is a dead end for exactly the person
  // reading it. The bill check needs one month and a piece of paper.
  assert.match(trend.detail, /bill check below never needs a second month/);
  assert.match(trend.detail, /before you owned the hub/);
});

test('a month measuring nothing has no trend even when the previous month does', () => {
  const trend = buildTrend(compareMonths(nothing, withDays(9.1, 102.4)), 'August 2026', 'July 2026');

  assert.equal(trend.available, false);
});

test('less energy than the previous month reads as good and names the month', () => {
  const trend = buildTrend(
    compareMonths(withDays(8, 90), withDays(10, 112)),
    'August 2026',
    'July 2026'
  );

  assert.equal(trend.available, true);
  assert.equal(trend.tone, 'good');
  assert.match(trend.headline, /20\.0% less energy than July 2026/);
  assert.match(trend.detail, /2\.00 kWh less than July 2026/);
});

test('more energy reads as an alert', () => {
  const trend = buildTrend(
    compareMonths(withDays(12, 134), withDays(10, 112)),
    'August 2026',
    'July 2026'
  );

  assert.equal(trend.tone, 'alert');
  assert.match(trend.headline, /20\.0% more energy than July 2026/);
});

test('a difference under the noise floor is neither good nor bad', () => {
  const trend = buildTrend(
    compareMonths(withDays(10.001, 112), withDays(10, 112)),
    'August 2026',
    'July 2026'
  );

  assert.equal(trend.available, true);
  assert.equal(trend.tone, 'neutral');
  assert.match(trend.headline, /About the same as July 2026/);
});

test('the headline always names the baseline it used', () => {
  // The whole failure was a comparison whose other side was invisible. Whatever
  // branch it takes, the sentence has to say what it compared against.
  const cases = [
    [withDays(8, 90), withDays(10, 112)],
    [withDays(12, 134), withDays(10, 112)],
    [withDays(10, 112), withDays(10, 112)],
    [withDays(3.23, 37.57), nothing],
  ];

  for (const [current, previous] of cases) {
    const trend = buildTrend(compareMonths(current, previous), 'August 2026', 'July 2026');
    assert.ok(
      trend.headline.includes('July 2026'),
      `headline omits the baseline: ${trend.headline}`
    );
  }
});
