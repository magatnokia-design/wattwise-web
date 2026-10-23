import { useEffect, useState } from 'react';
import { useHistory } from '../screens/History/hooks/useHistory';
import {
  describeLogDelivery,
  describeLogSource,
  formatCost,
  formatKwh,
  getTimestampMs,
} from '../screens/History/utils/historyHelpers';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { Badge, EmptyState, OfflineState, Spinner } from '../components/ui/Feedback';
import ExportUsageButton from '../components/history/ExportUsageButton';
import styles from './page.module.css';

/*
 * How many switch events the live listener holds, and how much further each
 * "Load more" reaches. The listener is capped by count, so paging further back
 * means raising the cap and re-subscribing - which keeps realtime updates
 * working, where a second paginated query would fight the live one.
 */
const ACTIVITY_PAGE_SIZE = 50;

const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'usage', label: 'Usage' },
];

/**
 * History, as on the phone since Oct 2026: Activity and Usage, paged, with no
 * outlet or date filters. Usage shows the date, energy and cost - the detail
 * per outlet is in the Excel export, whose dates are picked on the calendar.
 * Activity names the outlet only (not the appliance) and carries no wattage.
 * The explanatory paragraphs were removed on request.
 */
export const HistoryPage = () => {
  const [tab, setTab] = useState('activity');
  const [logLimit, setLogLimit] = useState(ACTIVITY_PAGE_SIZE);

  const {
    activityLogs,
    usageHistory,
    loading,
    usageLoading,
    hasMore,
    showOfflineState,
    fetchUsageHistory,
    subscribeActivityLogs,
  } = useHistory();

  // Every recorded day, up to a year (the hook's read limit), read once.
  useEffect(() => {
    fetchUsageHistory();
  }, [fetchUsageHistory]);

  // Streamed live - a toggle from the phone shows up here without a refresh.
  // Only while the tab is showing, as on the phone.
  useEffect(() => {
    if (tab !== 'activity') return undefined;
    const unsubscribe = subscribeActivityLogs({ outlet: 'all' }, logLimit);
    return () => unsubscribe();
  }, [tab, logLimit, subscribeActivityLogs]);

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <div className={styles.tabs} role="tablist" aria-label="History view">
          {TABS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={tab === option.id}
              className={`${styles.tab} ${tab === option.id ? styles.tabActive : ''}`}
              onClick={() => setTab(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'usage' ? (
        <Card>
          <CardHeader title="Usage" action={<ExportUsageButton usage={usageHistory} />} />
          {usageLoading && !usageHistory.length ? (
            <Spinner label="Loading usage" />
          ) : (
            <DataTable
              rowKey={(row) => row.date}
              defaultSort={{ key: 'date', direction: 'desc' }}
              pageSize={15}
              empty={
                showOfflineState ? (
                  <OfflineState title="Can't load your usage">
                    Your usage is safe — the page just needs a connection to load it.
                  </OfflineState>
                ) : (
                  <EmptyState icon="bar-chart-outline" title="No usage yet">
                    Today appears as soon as an outlet starts drawing power.
                  </EmptyState>
                )
              }
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  sortable: true,
                  render: (row) => (
                    <span className={styles.row}>
                      <strong>{row.day} {row.month}</strong>
                      {/* Today is measured so far, not a closed day. */}
                      {row.isLive ? <Badge tone="good">So far</Badge> : null}
                    </span>
                  ),
                },
                {
                  key: 'totalKwh',
                  header: 'Energy',
                  align: 'right',
                  sortable: true,
                  render: (row) => <span className="ww-num">{formatKwh(row.totalKwh)}</span>,
                },
                {
                  key: 'totalCost',
                  header: 'Cost',
                  align: 'right',
                  sortable: true,
                  render: (row) => <strong className="ww-num">{formatCost(row.totalCost)}</strong>,
                },
              ]}
              rows={usageHistory}
            />
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Activity" />
          {loading && !activityLogs.length ? (
            <Spinner label="Loading activity" />
          ) : (
            <DataTable
              rowKey={(row) => row.id}
              defaultSort={{ key: 'timestamp', direction: 'desc' }}
              pageSize={15}
              empty={
                showOfflineState ? (
                  <OfflineState title="Can't load your activity">
                    Your activity is safe — the page just needs a connection to load it.
                  </OfflineState>
                ) : (
                  <EmptyState icon="time-outline" title="No activity yet">
                    Every time an outlet turns on or off, it shows up here.
                  </EmptyState>
                )
              }
              columns={[
                {
                  key: 'timestamp',
                  header: 'When',
                  sortable: true,
                  sortValue: (row) => getTimestampMs(row.timestamp),
                  render: (row) => (
                    <span>
                      <strong>{row.time}</strong>{' '}
                      <span className={styles.muted}>{row.date}</span>
                    </span>
                  ),
                },
                {
                  // The outlet only - no appliance name (Oct 2026). The slot is
                  // the one part of a log line that is always true.
                  key: 'outlet',
                  header: 'Outlet',
                  sortable: true,
                  render: (row) => (row.outlet ? `Outlet ${row.outlet}` : 'Outlet'),
                },
                {
                  key: 'status',
                  header: 'Action',
                  /*
                   * The row is written when the switch is requested. When the
                   * Hub never confirmed it the badge hedges ("ON?") rather than
                   * disappears: the request is a true record, the relay is not
                   * known to have followed.
                   */
                  render: (row) => {
                    const delivery = describeLogDelivery(row);
                    if (!delivery) {
                      return <Badge tone={row.status === 'ON' ? 'good' : 'neutral'}>{row.status}</Badge>;
                    }
                    return (
                      <span className={styles.actionCell} title={delivery.note}>
                        <Badge tone="neutral">{row.status}?</Badge>
                        <Badge tone={delivery.tone}>{delivery.label}</Badge>
                      </span>
                    );
                  },
                },
                {
                  key: 'source',
                  header: 'Source',
                  sortable: true,
                  render: (row) => {
                    const described = describeLogSource(row.source);
                    return <Badge tone={described.tone}>{described.label}</Badge>;
                  },
                },
              ]}
              rows={activityLogs}
            />
          )}

          {hasMore ? (
            <div className={styles.logFooter}>
              <Button
                variant="secondary"
                size="sm"
                loading={loading}
                onClick={() => setLogLimit((current) => current + ACTIVITY_PAGE_SIZE)}
              >
                Load older activity
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};

export default HistoryPage;
