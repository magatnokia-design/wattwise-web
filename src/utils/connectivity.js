/**
 * Telling "you have no data" apart from "I could not ask".
 *
 * Kept deliberately in step with the phone app's `src/utils/connectivity.js`,
 * the same way `billing.js` is. Both clients talk to the same Firestore and hit
 * the same behaviour, and two codebases reasoning differently about an empty
 * list is how one of them ends up lying to the same user on a second screen.
 *
 * The distinction that was missing is not "is the browser online". It is "did a
 * read ever actually succeed", which is knowable at the point the result comes
 * back and needs no new dependency to observe. `navigator.onLine` is not used
 * on purpose: it reports the network interface, not whether Firestore answered,
 * and it says `true` on a captive portal that swallows every request.
 */

/**
 * Error codes that mean the request never reached the backend.
 */
const CONNECTIVITY_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'auth/network-request-failed',
  'auth/timeout',
  'functions/unavailable',
  'functions/deadline-exceeded',
  'storage/retry-limit-exceeded',
]);

/**
 * Substrings that identify a connectivity failure when no code survived.
 *
 * The service modules return `{ success: false, error: error.message }`, so a
 * result that has crossed that boundary has only prose left to go on. Matching
 * on message text is unreliable in general and is used only as a fallback.
 */
const CONNECTIVITY_PHRASES = [
  'client is offline',
  'could not reach cloud firestore',
  'failed to get document because the client is offline',
  'network request failed',
  'network error',
  'failed to fetch',
  'connection failed',
  'timeout',
];

const textOf = (value) => (typeof value === 'string' ? value : '').toLowerCase();

/**
 * Whether a failure was the network rather than the request.
 *
 * @param {Error|{error?: string, code?: string}|null|undefined} failure
 * @returns {boolean} true only when the request did not reach the backend.
 */
export const isConnectivityError = (failure) => {
  if (!failure) return false;

  const code = textOf(failure.code);
  if (code && CONNECTIVITY_CODES.has(code)) return true;

  const message = textOf(failure.message || failure.error);
  if (!message) return false;

  return CONNECTIVITY_PHRASES.some((phrase) => message.includes(phrase));
};

/**
 * Whether an empty result means "nothing there" or "I don't know".
 *
 * This is the whole fix, and the asymmetry behind it is a Firestore behaviour
 * rather than anything either client does wrong:
 *
 *   getDoc  on a missing single document, offline -> REJECTS
 *   getDocs on a query,                   offline -> RESOLVES, empty, fromCache
 *
 * So a query reaches the caller through the SUCCESS path carrying an empty
 * array, and every page drew the empty state written for a brand-new account.
 * On the phone that produced "Nothing recorded for Aug 2026" over a month of
 * real readings; the same pages here say the same thing.
 *
 * Cached rows that are not empty are real and worth showing - a warm page that
 * loses its connection should keep displaying what it last knew. Only empty AND
 * unconfirmed means the answer has not arrived.
 *
 * @param {number} count Documents in the snapshot.
 * @param {{fromCache?: boolean}} meta Snapshot metadata.
 */
export const isUnconfirmedEmpty = (count, meta) =>
  count === 0 && !!meta?.fromCache;

/**
 * How long a listener's empty cached snapshot is given before it counts.
 *
 * `getDocs` resolves once, so an empty cached result there is final. A listener
 * is different: it delivers a first snapshot from the local cache immediately,
 * even when the browser is online and the server answer is a moment behind. On
 * a fresh page load that first snapshot is empty and marked `fromCache`, which
 * looks exactly like being offline.
 *
 * Reporting it straight away would flash an offline notice on every load.
 * Waiting forever would leave a genuinely offline page spinning. So the empty
 * snapshot is held, and only counts if the server has still said nothing by the
 * time this elapses.
 */
export const UNCONFIRMED_GRACE_MS = 2500;

/**
 * What a read reports when its empty result came from an empty cache.
 *
 * `isConnectivityError` recognises the code, so this routes to the offline
 * state exactly like a rejected single-document read.
 */
export const UNREACHABLE_READ_RESULT = Object.freeze({
  success: false,
  code: 'unavailable',
  error: 'Could not reach Cloud Firestore — the empty result came from a local cache.',
});

/**
 * How long a write waits for the server before the UI stops waiting with it.
 */
export const WRITE_TIMEOUT_MS = 8000;

/**
 * The result a bounded write reports when the server never answered.
 *
 * `pending: true` is the part callers must not flatten into a plain failure.
 * The write has not been rejected - it is queued.
 */
export const PENDING_WRITE_RESULT = Object.freeze({
  success: false,
  pending: true,
  code: 'unavailable',
  error: 'No connection — the change has not reached the server yet.',
});

/**
 * Put a ceiling on a write that would otherwise wait forever.
 *
 * A Firestore write does not reject when there is no route to the server.
 * `setDoc`, `updateDoc`, `addDoc` and `deleteDoc` resolve when the *server*
 * acknowledges, so with no connection the promise simply stays pending: the
 * caller's `await` never returns and the button spins.
 *
 * This does not cancel anything. Firestore keeps the write queued and sends it
 * when the connection returns, so the result says `pending`, not "failed" - and
 * the message shown must not claim the change did not happen, because it very
 * likely will. Firestore is initialized with no persistent cache, so the
 * queue lives in memory only and closing the tab drops it.
 *
 * @param {Promise} promise The write in flight.
 * @param {number} [timeoutMs]
 */
export const withWriteTimeout = async (promise, timeoutMs = WRITE_TIMEOUT_MS) => {
  let timer = null;

  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(PENDING_WRITE_RESULT), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export default {
  isConnectivityError,
  isUnconfirmedEmpty,
  UNCONFIRMED_GRACE_MS,
  UNREACHABLE_READ_RESULT,
  withWriteTimeout,
  WRITE_TIMEOUT_MS,
  PENDING_WRITE_RESULT,
};
