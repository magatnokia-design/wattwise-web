import assert from 'node:assert/strict';
import test from 'node:test';

import { describeLogDelivery } from '../src/screens/History/utils/historyHelpers.js';

/*
 * History rows are written when a switch is *requested*, not when the relay
 * moves - the ESP32 only learns about a command when it next polls. So a row
 * saying "OFF" read as "the relay opened" even when the hub had been off the
 * network the whole time, which is exactly what happened on 18 Aug 2026: two
 * outlet2 toggles logged normally and both commands timed out.
 *
 * The backend now stamps `delivery.confirmed: false` on the row it wrote. These
 * tests pin the two properties that matter: an un-stamped row must look exactly
 * as it always did, and a stamped one must not be described more definitely than
 * the evidence allows.
 */

test('an ordinary row carries no delivery flag at all', () => {
  assert.equal(describeLogDelivery({ status: 'OFF', source: 'manual' }), null);
});

test('a row the hub acknowledged is not flagged', () => {
  assert.equal(describeLogDelivery({ delivery: { confirmed: true } }), null);
});

test('a timeout is described as unknown, not as a failure', () => {
  const described = describeLogDelivery({ delivery: { confirmed: false, status: 'timeout' } });
  assert.equal(described.label, 'Not confirmed');
  assert.equal(described.tone, 'warn');
  // The hub never answered, so nothing is known about the relay. Saying
  // "Failed" would claim knowledge the system does not have.
  assert.match(described.note, /may not have changed/);
});

test('a refusal the hub actually reported is described definitely', () => {
  const failed = describeLogDelivery({ delivery: { confirmed: false, status: 'failed' } });
  assert.equal(failed.label, 'Failed');
  assert.equal(failed.tone, 'danger');

  const rejected = describeLogDelivery({ delivery: { confirmed: false, status: 'rejected' } });
  assert.equal(rejected.label, 'Rejected');
  assert.equal(rejected.tone, 'danger');
});

test('status matching is not case- or whitespace-sensitive', () => {
  assert.equal(
    describeLogDelivery({ delivery: { confirmed: false, status: ' TIMEOUT ' } }).label,
    'Not confirmed'
  );
});

test('an unrecognised status falls back to the weaker claim', () => {
  // Anything the clients do not know about is treated as "we cannot vouch for
  // this row", never as a confirmed failure.
  const described = describeLogDelivery({ delivery: { confirmed: false, status: 'wat' } });
  assert.equal(described.label, 'Not confirmed');
});

test('confirmed:false with no status still flags the row', () => {
  assert.equal(describeLogDelivery({ delivery: { confirmed: false } }).label, 'Not confirmed');
});

test('missing and malformed rows do not throw', () => {
  assert.equal(describeLogDelivery(), null);
  assert.equal(describeLogDelivery({}), null);
  assert.equal(describeLogDelivery({ delivery: null }), null);
});

test('every tone used is one the Badge component actually defines', () => {
  // `tone="warning"` shipped once and silently matched no CSS class at all.
  const valid = new Set(['neutral', 'good', 'warn', 'alert', 'danger', 'info']);
  ['timeout', 'failed', 'rejected'].forEach((status) => {
    const { tone } = describeLogDelivery({ delivery: { confirmed: false, status } });
    assert.ok(valid.has(tone), `${status} -> unknown tone "${tone}"`);
  });
});
