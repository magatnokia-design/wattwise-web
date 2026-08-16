import { useEffect, useState } from 'react';
import { securityService } from '../../services/firebase/securityService';
import { describeSecurityEvents } from '../../utils/securityActivity';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState, Spinner } from '../ui/Feedback';
import styles from './SecurityActivityCard.module.css';

/**
 * Recent security activity on the account.
 *
 * Read-only, with no "clear" and no "mark as read". Both would be writes, and
 * the rules forbid every client from writing here on purpose: an actor who
 * could delete entries could erase the record of what they did. A log a user
 * can empty is a log an intruder can empty.
 *
 * Live rather than fetched once, because the thing worth showing - a device
 * token being guessed at - is happening now, not when the page was opened.
 */
export const SecurityActivityCard = ({ userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return undefined;

    setLoading(true);

    const unsubscribe = securityService.subscribeSecurityEvents(
      userId,
      (next) => {
        setEvents(next);
        setLoading(false);
      },
      (err) => {
        setError(err?.message || 'Could not load security activity');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const rows = describeSecurityEvents(events);

  return (
    <Card>
      <CardHeader
        title="Security activity"
        subtitle="Sign-ins and device changes on your account, kept for 90 days."
      />

      {loading ? (
        <Spinner label="Loading security activity" />
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon="🛡️" title="Nothing to report">
          Nothing unusual has happened on your account. Device changes and refused
          sign-ins would appear here.
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li
              key={row.id}
              className={`${styles.row} ${row.tone === 'alert' ? styles.alert : ''}`}
            >
              <div className={styles.head}>
                <strong className={styles.title}>{row.title}</strong>
                <span className={styles.when}>{row.when}</span>
              </div>
              <p className={styles.body}>{row.body}</p>
              {row.deviceId ? <p className={styles.meta}>Unit: {row.deviceId}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default SecurityActivityCard;
