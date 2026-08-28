import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_VISIBLE,
  describeRun,
  groupSecurityRows,
} from '../src/components/settings/securityActivityGrouping.js';

/*
 * The case this exists for: a token rotation leaves the hub retrying with a
 * stale token every 1.2s, and the log faithfully records every refusal. One
 * card each turned the Settings page into a column of identical amber boxes and
 * hid every other event on the account.
 */

const row = (overrides = {}) => ({
  id: 'e1',
  type: 'device_auth_failed',
  title: 'Device sign-in refused',
  body: 'Something tried to send readings using the wrong device token.',
  tone: 'alert',
  deviceId: 'ESP32_ROOM_A',
  when: '2 minutes ago',
  ...overrides,
});

test('a run of identical refusals collapses to one row', () => {
  const groups = groupSecurityRows([
    row({ id: 'a', when: '2 minutes ago' }),
    row({ id: 'b', when: '5 minutes ago' }),
    row({ id: 'c', when: '22 minutes ago' }),
  ]);

  assert.equal(groups.length, 1, 'three refusals are one situation');
  assert.equal(groups[0].count, 3);
  assert.equal(groups[0].when, '2 minutes ago', 'keeps the newest as the headline');
  assert.equal(groups[0].oldestWhen, '22 minutes ago', 'and carries the far end of the run');
});

test('a different event in the middle breaks the run', () => {
  const groups = groupSecurityRows([
    row({ id: 'a' }),
    row({ id: 'b', type: 'device_linked', title: 'WattWise unit linked', tone: 'info' }),
    row({ id: 'c' }),
  ]);

  assert.equal(groups.length, 3, 'stitching across the gap would fake "these happened together"');
  assert.deepEqual(groups.map((g) => g.count), [1, 1, 1]);
});

test('the same event type on a different unit is not folded together', () => {
  const groups = groupSecurityRows([
    row({ id: 'a', deviceId: 'ESP32_ROOM_A' }),
    row({ id: 'b', deviceId: 'ESP32_ROOM_B' }),
  ]);

  assert.equal(groups.length, 2, 'which unit is the first thing a person asks');
});

test('an empty log produces no groups', () => {
  assert.deepEqual(groupSecurityRows([]), []);
  assert.deepEqual(groupSecurityRows(), []);
});

test('a single event gets no run summary', () => {
  const [group] = groupSecurityRows([row()]);
  assert.equal(describeRun(group), '', 'saying "1 times" would be noise on every ordinary row');
});

test('a run inside one time bucket uses the short form', () => {
  const groups = groupSecurityRows([
    row({ id: 'a', when: '2 minutes ago' }),
    row({ id: 'b', when: '2 minutes ago' }),
  ]);

  assert.equal(describeRun(groups[0]), '2 times, 2 minutes ago');
});

test('a run that spans buckets states both ends', () => {
  const groups = groupSecurityRows([
    row({ id: 'a', when: '2 minutes ago' }),
    row({ id: 'b', when: '22 minutes ago' }),
  ]);

  assert.equal(describeRun(groups[0]), '2 times, from 22 minutes ago to 2 minutes ago');
});

test('the visible cap leaves room for more than one situation', () => {
  assert.ok(INITIAL_VISIBLE >= 3, 'collapsing to a single row would hide unrelated events');
});
