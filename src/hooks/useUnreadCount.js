import { useEffect, useState } from 'react';
import { notificationService } from '../services/firebase';

/**
 * Just the unread badge number.
 *
 * The sidebar renders on every authenticated page, so what it subscribes to is
 * paid for on every page. `useNotifications` opens two listeners — the latest
 * 20 documents *and* the unread count — and the shell only ever reads the
 * count, so this takes the cheap half on its own. The Notifications page still
 * mounts the full hook; that is the one place the list is actually shown.
 *
 * @param {string|null|undefined} userId
 */
export const useUnreadCount = (userId) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return undefined;
    }

    const unsubscribe = notificationService.subscribeToUnreadCount(
      userId,
      (count) => setUnreadCount(Number(count) || 0),
      (error) => console.error('Unread count subscription error:', error)
    );

    return () => unsubscribe();
  }, [userId]);

  return unreadCount;
};

export default useUnreadCount;
