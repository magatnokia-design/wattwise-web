import { useEffect, useMemo, useState } from 'react';
import { securityService } from '../../services/firebase/securityService';
import { describeSecurityEvents } from '../../utils/securityActivity';
import {
  INITIAL_VISIBLE,
  describeRun,
  groupSecurityRows,
} from './securityActivityGrouping';
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
 *
 * Runs of identical entries are collapsed before rendering; see
 * `securityActivityGrouping.js` for why the raw one-card-per-event form made
 * this card unreadable.
 */
export const SecurityActivityCard = ({ userId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

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

  const groups = useMemo(() => groupSecurityRows(describeSecurityEvents(events)), [events]);

  const hidden = Math.max(0, groups.length - INITIAL_VISIBLE);
  const visible = expanded ? groups : groups.slice(0, INITIAL_VISIBLE);

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
      ) : groups.length === 0 ? (
        <EmptyState icon="🛡️" title="Nothing to report">
          Nothing unusual has happened on your account. Device changes and refused
          sign-ins would appear here.
        </EmptyState>
      ) : (
        <>
          <ul className={styles.list}>
            {visible.map((group) => {
              const run = describeRun(group);

              return (
                <li
                  key={group.id}
                  className={`${styles.row} ${group.tone === 'alert' ? styles.alert : ''}`}
                >
                  <div className={styles.head}>
                    <strong className={styles.title}>
                      {group.title}
                      {group.count > 1 ? (
                        <span className={styles.count}>&times;{group.count}</span>
                      ) : null}
                    </strong>
                    <span className={styles.when}>{group.when}</span>
                  </div>
                  <p className={styles.body}>{group.body}</p>
                  {run ? <p className={styles.run}>{run}</p> : null}
                  {group.deviceId ? <p className={styles.meta}>Unit: {group.deviceId}</p> : null}
                </li>
              );
            })}
          </ul>

          {hidden > 0 ? (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Show less' : `Show ${hidden} older ${hidden === 1 ? 'entry' : 'entries'}`}
            </button>
          ) : null}
        </>
      )}
    </Card>
  );
};

export default SecurityActivityCard;
