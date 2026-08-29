import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isConnectivityError,
  isUnconfirmedEmpty,
  withWriteTimeout,
  PENDING_WRITE_RESULT,
  UNREACHABLE_READ_RESULT,
} from '../src/utils/connectivity.js';

/*
 * The bug these tests exist for, found on the phone app 29 August 2026 and
 * present here in the same shape.
 *
 * Four screens read a `showOfflineState` flag. Only one of them ever showed an
 * offline state, and the difference was not in the screens - it was one layer
 * down, in a Firestore behaviour:
 *
 *   getDoc  on a missing single document, offline -> REJECTS
 *   getDocs on a query,                   offline -> RESOLVES, empty, fromCache
 *
 * The screen whose first read was a single document threw and raised the flag.
 * The rest ran queries, which came back through the SUCCESS path carrying an
 * empty array, so every hook recorded a successful load and the flag could
 * never go up.
 */

test('an empty query served from cache is not an answer', () => {
  assert.equal(isUnconfirmedEmpty(0, { fromCache: true }), true);
});

test('an empty query the server confirmed is an answer - the account is empty', () => {
  // The regression risk in the other direction: a genuinely new account must
  // still reach its empty state rather than a permanent offline notice.
  assert.equal(isUnconfirmedEmpty(0, { fromCache: false }), false);
});

test('cached rows that are not empty are real and must still be shown', () => {
  // A page that loses its connection after loading keeps what it last knew.
  assert.equal(isUnconfirmedEmpty(3, { fromCache: true }), false);
});

test('missing metadata is treated as confirmed rather than assumed offline', () => {
  assert.equal(isUnconfirmedEmpty(0, undefined), false);
  assert.equal(isUnconfirmedEmpty(0, {}), false);
});

test('the unreachable-read result routes to the offline state', () => {
  assert.equal(isConnectivityError(UNREACHABLE_READ_RESULT), true);
  assert.equal(UNREACHABLE_READ_RESULT.success, false);
});

test('an ordinary failure is not mistaken for a connectivity one', () => {
  // A permission denial must not draw "check your network".
  assert.equal(isConnectivityError({ code: 'permission-denied' }), false);
  assert.equal(isConnectivityError({ error: 'Missing or insufficient permissions.' }), false);
});

test('a browser fetch failure counts as connectivity', () => {
  // What a blocked request looks like in a browser, where the phone app would
  // have seen "network request failed" instead.
  assert.equal(isConnectivityError(new TypeError('Failed to fetch')), true);
});

/*
 * The write half. A Firestore write does not reject with no route to the
 * server - it resolves when the *server* acknowledges, so the promise stays
 * pending and the button spins. A never-settling promise stands in for it.
 */
const neverSettles = () => new Promise(() => {});

test('a write that never settles is reported as pending, not as failure', async () => {
  const result = await withWriteTimeout(neverSettles(), 20);

  assert.equal(result.success, false);
  assert.equal(result.pending, true);
  assert.equal(result.code, 'unavailable');
});

test('a write that answers in time passes its own result through untouched', async () => {
  const saved = { success: true, id: 'bill_2026_08' };
  assert.deepEqual(await withWriteTimeout(Promise.resolve(saved), 50), saved);
});

test('a write that rejects still rejects - a real error is not a pending write', async () => {
  await assert.rejects(
    withWriteTimeout(Promise.reject(new Error('permission-denied')), 50),
    /permission-denied/
  );
});

test('the shared results are frozen, so one caller cannot reword them for the next', () => {
  assert.throws(() => {
    PENDING_WRITE_RESULT.error = 'something else';
  });
  assert.throws(() => {
    UNREACHABLE_READ_RESULT.success = true;
  });
});
