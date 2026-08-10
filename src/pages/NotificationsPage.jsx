import { useNotifications } from '../screens/Notifications/hooks/useNotifications';
import {
  formatNotificationDate,
  formatNotificationTime,
  getNotificationColor,
  getNotificationIcon,
} from '../screens/Notifications/utils/notificationHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import notificationStyles from './NotificationsPage.module.css';

export const NotificationsPage = () => {
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <p className={styles.lede}>
          The same alerts the phone app pushes — budget thresholds, safety cut-offs, device events.
          Reading one here marks it read everywhere.
        </p>
        <div className={styles.row}>
          <Button size="sm" variant="secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
          <Button size="sm" variant="danger" onClick={clearAll} disabled={notifications.length === 0}>
            Clear all
          </Button>
        </div>
      </div>

      {error ? <Banner tone="alert">{error}</Banner> : null}

      <Card>
        <CardHeader
          title="Notifications"
          subtitle={
            unreadCount > 0 ? `${unreadCount} unread` : 'Everything here has been read'
          }
        />

        {loading && !notifications.length ? (
          <Spinner label="Loading notifications" />
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="Nothing yet">
            Alerts appear when a budget threshold is crossed, a timer fires, or the safety cut-off
            trips.
          </EmptyState>
        ) : (
          <ul className={notificationStyles.list}>
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`${notificationStyles.item} ${
                  notification.read ? '' : notificationStyles.unread
                }`}
              >
                <span
                  className={notificationStyles.icon}
                  style={{ background: `${getNotificationColor(notification.type)}1a` }}
                  aria-hidden="true"
                >
                  {getNotificationIcon(notification.type)}
                </span>

                <div className={notificationStyles.body}>
                  <div className={notificationStyles.head}>
                    <p className={notificationStyles.title}>{notification.title}</p>
                    {notification.outlet ? (
                      <Badge tone="neutral">Outlet {notification.outlet}</Badge>
                    ) : null}
                    {!notification.read ? <Badge tone="info">New</Badge> : null}
                  </div>
                  <p className={notificationStyles.message}>{notification.message}</p>
                  <p className={notificationStyles.meta}>
                    {formatNotificationTime(notification.timestamp)} ·{' '}
                    {formatNotificationDate(notification.timestamp)}
                  </p>
                </div>

                {!notification.read ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
