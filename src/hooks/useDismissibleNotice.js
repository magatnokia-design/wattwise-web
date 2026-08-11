import { useCallback, useState } from 'react';

/**
 * A banner the user can dismiss for good.
 *
 * Web rewrite of the phone app's hook: same contract, localStorage instead of
 * AsyncStorage. Dismissal is stored on the device rather than in Firestore —
 * it is a UI preference about this browser, not account state worth syncing,
 * and keeping it local means dismissing never waits on the network.
 *
 * Unlike the phone version this reads synchronously, so there is no async gap
 * in which a previously dismissed banner could flash on screen.
 */
export const useDismissibleNotice = (key) => {
  const storageKey = `notice_dismissed_${key}`;

  const [visible, setVisible] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) !== 'true';
    } catch {
      // Storage blocked (private mode, third-party cookie rules). A storage
      // failure should not suppress the warning it guards.
      return true;
    }
  });

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // Dismissed for this session either way; it returns next load.
    }
  }, [storageKey]);

  return { visible, dismiss };
};

export default useDismissibleNotice;
