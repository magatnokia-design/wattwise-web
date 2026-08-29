import { useState, useCallback } from 'react';
import { isConnectivityError } from '../utils/connectivity';

/**
 * Whether a read ever actually landed, kept separate from whether one is in
 * flight.
 *
 * Ported from the phone app's hook of the same name, and kept in step with it
 * on purpose. A single `loading` boolean cannot express the state this app was
 * in with no route to Firestore: not loading, holding nothing, and with no idea
 * whether that nothing is the truth. Every page read the empty collection and
 * drew the empty state written for a brand-new account, so a browser with no
 * connection told a user with a full account that they had no bills, no budget
 * and no alerts.
 *
 * `hasLoadedOnce` is the flag that was missing. Only a read that genuinely
 * returned sets it, so an empty state can require it before asserting that the
 * account is empty.
 *
 * Usage:
 *
 *   const load = useLoadOutcome();
 *   try {
 *     const result = await service.get(uid);
 *     if (result.success) { apply(result.data); load.succeeded(); }
 *     else load.failed(result);
 *   } catch (error) { load.failed(error); }
 */
export const useLoadOutcome = () => {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isUnreachable, setIsUnreachable] = useState(false);

  const succeeded = useCallback(() => {
    setHasLoadedOnce(true);
    setIsUnreachable(false);
  }, []);

  /**
   * A read did not return.
   *
   * A non-connectivity failure - a permission denial, a malformed document -
   * leaves `hasLoadedOnce` false too, so nothing downstream claims the account
   * is empty on the strength of a failed read.
   */
  const failed = useCallback((failure) => {
    setIsUnreachable(isConnectivityError(failure));
  }, []);

  /** Signing out, or switching user, where nothing read so far applies. */
  const reset = useCallback(() => {
    setHasLoadedOnce(false);
    setIsUnreachable(false);
  }, []);

  return {
    hasLoadedOnce,
    isUnreachable,
    succeeded,
    failed,
    reset,
    // Safe to claim the account holds nothing: a read came back and said so.
    showEmptyState: hasLoadedOnce,
    // Nothing was ever read and the backend was out of reach. Data already in
    // hand wins over a later drop, so this is false once anything has loaded.
    showOfflineState: isUnreachable && !hasLoadedOnce,
  };
};

export default useLoadOutcome;
