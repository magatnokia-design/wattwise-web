import assert from 'node:assert/strict';
import test from 'node:test';

import { describeNotificationDetails } from '../src/screens/Notifications/utils/notificationHelpers.js';

const labels = (item) => describeNotificationDetails(item).map((row) => row.label);
const value = (item, label) =>
  describeNotificationDetails(item).find((row) => row.label === label)?.value;

/*
 * The detail rows under a notification exist to carry what the title and message
 * cannot. Anything that repeats the sentence above it, or that names a database
 * row, is noise on a screen the user opened to find out what happened.
 */

test('a countdown notification shows no detail rows at all', () => {
  // Exactly the shape checkScheduledTimers writes. The title already says
  // "Timer turned off My Ceiling Fan" and the body says the countdown finished.
  const item = {
    metadata: { scheduleId: 'jSt9nisEwYn3xm0tpKiV', scheduleType: 'countdown', action: 'off' },
  };

  assert.deepEqual(describeNotificationDetails(item), []);
});

test('a schedule notification shows no detail rows either', () => {
  const item = {
    metadata: { scheduleId: 'abc123', scheduleType: 'scheduled', action: 'on' },
  };

  assert.deepEqual(describeNotificationDetails(item), []);
});

test('no document id reaches the screen, whatever it is called', () => {
  // The `Id$` rule is generic on purpose: the next handler to stash a reference
  // in metadata should not put one back in front of the user.
  const item = {
    metadata: { scheduleId: 'a', commandId: 'b', deviceId: 'c', invoiceId: 'd', outletId: 'e' },
  };

  assert.deepEqual(describeNotificationDetails(item), []);
});

test('an auto-cutoff does not invent readings it never recorded', () => {
  // handleSafetyAlerts writes `{ stage }` alone here. Both outlet rows used to
  // render "0.0 V · 0.00 A · 0.0 W" — full precision, entirely fabricated.
  const item = { metadata: { stage: 'cutoff' } };

  assert.deepEqual(labels(item), ['Stage']);
  assert.equal(value(item, 'Stage'), 'Cutoff');
});

test('a stage change still shows both outlets when the readings are there', () => {
  const item = {
    metadata: {
      stage: 'warning',
      outlet1Voltage: 242.3999939,
      outlet1Current: 0.17,
      outlet1Power: 41.2,
      outlet2Voltage: 242.1,
      outlet2Current: 0,
      outlet2Power: 0,
    },
  };

  assert.deepEqual(labels(item), ['Stage', 'Outlet 1', 'Outlet 2']);
  // The float is rounded rather than printed raw — 242.3999939 reads as a fault.
  assert.match(value(item, 'Outlet 1'), /^242\.4 V/);
});

test('one outlet reporting does not force a blank row for the other', () => {
  const item = { metadata: { stage: 'limit', outlet1Power: 480 } };

  assert.deepEqual(labels(item), ['Stage', 'Outlet 1']);
});

test('a finished charge is labelled, not dumped as raw keys', () => {
  const item = { metadata: { type: 'charge_complete', peakPowerW: 29.8, restingPowerW: 2.1 } };

  assert.deepEqual(labels(item), ['Peak draw', 'Now resting at']);
  assert.equal(value(item, 'Peak draw'), '29.8 W');
});

test('an invoice keeps its currency and its unit', () => {
  const item = {
    metadata: { billingMonth: '2026-08', totalKwh: 12.3456, totalAmountDue: 137.5 },
  };

  assert.deepEqual(labels(item), ['Billing month', 'Energy used', 'Amount due']);
  assert.equal(value(item, 'Billing month'), 'August 2026');
  assert.equal(value(item, 'Energy used'), '12.346 kWh');
  assert.equal(value(item, 'Amount due'), '₱137.50');
});

test('the overpower cutoff still explains itself', () => {
  const item = { metadata: { powerW: 512.4, limitW: 500, type: 'outlet_overpower' } };

  assert.deepEqual(labels(item), ['Draw', 'Cut-off limit']);
  assert.equal(value(item, 'Cut-off limit'), '500.0 W');
});

test('the budget alert is unchanged', () => {
  const item = {
    metadata: {
      month: '2026-08',
      percentage: 82.4,
      threshold: 80,
      currentSpending: 412.5,
      monthlyBudget: 500,
    },
  };

  assert.deepEqual(labels(item), [
    'Month',
    'Budget used',
    'Alert level',
    'Spent so far',
    'Monthly budget',
  ]);
});

test('an unknown future shape still renders rather than disappearing', () => {
  // The catch-all is the reason this function has a fallback at all.
  const item = { metadata: { somethingNew: 7 } };

  assert.deepEqual(labels(item), ['Something New']);
});

test('missing or malformed metadata yields nothing, not a crash', () => {
  assert.deepEqual(describeNotificationDetails({}), []);
  assert.deepEqual(describeNotificationDetails({ metadata: null }), []);
  assert.deepEqual(describeNotificationDetails(), []);
});
