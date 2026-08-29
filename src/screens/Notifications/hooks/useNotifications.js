import { useState, useCallback, useEffect, useRef } from 'react';
import { notificationService } from '../../../services/firebase';
import { auth } from '../../../services/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { useLoadOutcome } from '../../../hooks/useLoadTracker';
import {
  isUnconfirmedEmpty,
  UNREACHABLE_READ_RESULT,
  UNCONFIRMED_GRACE_MS,
} from '../../../utils/connectivity';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // An empty list is not on its own evidence that the account has no alerts -
  // it is also what an unread collection looks like. This says which.
  const load = useLoadOutcome();

  // Pending decision on a listener snapshot that was empty and came from the
  // cache. Cancelled the moment the server confirms anything.
  const unconfirmedTimer = useRef(null);
  const clearUnconfirmed = useCallback(() => {
    if (unconfirmedTimer.current) {
      clearTimeout(unconfirmedTimer.current);
      unconfirmedTimer.current = null;
    }
  }, []);

  // Load notifications on mount with real-time listener
  useEffect(() => {
    let unsubscribeNotifications = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
      }

      if (!user?.uid) {
        setNotifications([]);
        load.reset();
        return;
      }

      unsubscribeNotifications = notificationService.subscribeToNotifications(
        user.uid,
        (notificationsData, meta) => {
          setNotifications(notificationsData);

          // Held rather than acted on: a listener's first snapshot comes from
          // the cache even when the server is a moment behind, so an empty one
          // is not yet evidence of anything. See UNCONFIRMED_GRACE_MS.
          if (isUnconfirmedEmpty(notificationsData.length, meta)) {
            if (!unconfirmedTimer.current) {
              unconfirmedTimer.current = setTimeout(() => {
                unconfirmedTimer.current = null;
                load.failed(UNREACHABLE_READ_RESULT);
              }, UNCONFIRMED_GRACE_MS);
            }
            return;
          }

          clearUnconfirmed();
          load.succeeded();
        },
        (err) => {
          setError(err.message);
          clearUnconfirmed();
          load.failed(err);
          console.error('Notifications subscription error:', err);
        }
      );
    });

    return () => {
      clearUnconfirmed();
      if (unsubscribeNotifications) unsubscribeNotifications();
      unsubscribeAuth();
    };
  }, [clearUnconfirmed, load.succeeded, load.failed, load.reset]);

  // Load unread count with real-time listener
  useEffect(() => {
    let unsubscribeUnread = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeUnread) {
        unsubscribeUnread();
        unsubscribeUnread = null;
      }

      if (!user?.uid) {
        setUnreadCount(0);
        return;
      }

      unsubscribeUnread = notificationService.subscribeToUnreadCount(
        user.uid,
        (count) => {
          setUnreadCount(count);
        },
        (err) => {
          console.error('Unread count subscription error:', err);
        }
      );
    });

    return () => {
      if (unsubscribeUnread) unsubscribeUnread();
      unsubscribeAuth();
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const result = await notificationService.getNotifications(userId);

      if (!result.success) {
        throw new Error(result.error);
      }

      setNotifications(result.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notificationId) => {
    setError(null);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const result = await notificationService.markAsRead(userId, notificationId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error marking as read:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setError(null);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const result = await notificationService.markAllAsRead(userId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error marking all as read:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Clear all
  const clearAll = useCallback(async () => {
    setError(null);
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const result = await notificationService.clearAllNotifications(userId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error clearing notifications:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    showEmptyState: load.showEmptyState,
    showOfflineState: load.showOfflineState,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};