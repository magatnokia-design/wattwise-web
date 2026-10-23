import { useEffect, useMemo, useState } from 'react';
import { useHistory } from '../screens/History/hooks/useHistory';
import {
  describeLogDelivery,
  describeLogSource,
  formatCost,
  formatKwh,
} from '../screens/History/utils/historyHelpers';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { Pager } from '../components/ui/Pager';
import { resolvePage, describeRange } from '../components/ui/pagination';
import { Badge, EmptyState, OfflineState, Spinner } from '../components/ui/Feedback';
import ExportUsageButton from '../components/history/ExportUsageButton';
import styles from './page.module.css';

// Rows a page, on both tabs.
const PAGE_SIZE = 15;

const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'usage', label: 'Usage' },
];

/**
 * History, as on the phone since Oct 2026: Activity and Usage, one pager each
 * ("Page 2 of 7"), no outlet or date filters. Usage shows the date, energy and
 * cost - the per-outlet detail is in the Excel export beside the tabs.
 * Activity names the outlet only and carries no wattage.
 *
 * Activity used to stack two pagers - the table's own over the 50 switches
 * loaded, and a "Load older activity" button under it. That button keyed off
 * `hasMore`, which only the one-shot fetch sets, never the live listener this
 * page uses, so it showed for ever, including on an account with nothing
 * older. Now there is one pager and the real total (countActivityLogs) says
 * how many pages there are; stepping forward grows the live listener to cover
 * that page, one row past it - the phone's arrangement.
 */
export const HistoryPage = () => {
  const [tab, setTab] = useState('activity');
  const [activityPage, setActivityPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);

  const {
    activityLogs,
    activityTotal,
    usageHistory,
    loading,
    usageLoading,
    showOfflineState,
    fetchUsageHistory,
    subscribeActivityLogs,
  } = useHistory();

  // Every recorded day, up to a year (the hook's read limit), read once.
  useEffect(() => {
    fetchUsageHistory();
  }, [fetchUsageHistory]);

  // Live, so a switch from the phone appears without a refresh. Sized to the
  // page on screen plus one row, which is how a next page is known to exist
  // before the total has been counted.
  const activityLimit = activityPage * PAGE_SIZE + 1;
  useEffect(() => {
    if (tab !== 'activity') return undefined;
    const unsubscribe = subscribeActivityLogs({ outlet: 'all' }, activityLimit);
    return () => unsubscribe();
  }, [tab, activityLimit, subscribeActivityLogs]);

  const activity = useMemo(() => {
    const start = (activityPage - 1) * PAGE_SIZE;
    const rows = activityLogs.slice(start, start + PAGE_SIZE);
    const hasNext = activityLogs.length > start + PAGE_SIZE;
    const totalPages = activityTotal
      ? Math.max(1, Math.ceil(activityTotal / PAGE_SIZE))
      : hasNext ? activityPage + 1 : activityPage;
    return { rows, start, totalPages };
  }, [activityLogs, activityTotal, activityPage]);

  // Usage is all in hand, so it pages locally - newest first.
  const usage = useMemo(() => {
    const sorted = [...usageHistory].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const paged = resolvePage({ page: usagePage, totalRows: sorted.length, pageSize: PAGE_SIZE });
    return { ...paged, rows: sorted.slice(paged.start, paged.end), total: sorted.length };
  }, [usageHistory, usagePage]);

  // While the listener grows to reach a new page it still holds the shorter
  // list, so that page reads empty for a moment - a spinner, not "no activity".
  const activityPageLoading = loading && activity.rows.length === 0;

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
        {tab === 'usage' ? <ExportUsageButton usage={usageHistory} /> : null}
      </div>

      {tab === 'usage' ? (
        <Card>
          {usageLoading && !usageHistory.length ? (
            <Spinner label="Loading usage" />
          ) : (
            <>
              <DataTable
                rowKey={(row) => row.date}
                empty={
                  showOfflineState ? (
                    <OfflineState title="Can't load your usage" />
                  ) : (
                    <EmptyState icon="bar-chart-outline" title="No usage yet" />
                  )
                }
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
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
                    render: (row) => <span className="ww-num">{formatKwh(row.totalKwh)}</span>,
                  },
                  {
                    key: 'totalCost',
                    header: 'Cost',
                    align: 'right',
                    render: (row) => <strong className="ww-num">{formatCost(row.totalCost)}</strong>,
                  },
                ]}
                rows={usage.rows}
              />
              <Pager
                label="Usage pages"
                page={usage.page}
                totalPages={usage.totalPages}
                info={describeRange({ start: usage.start, end: usage.end, totalRows: usage.total })}
                onPrevious={() => setUsagePage(usage.page - 1)}
                onNext={() => setUsagePage(usage.page + 1)}
              />
            </>
          )}
        </Card>
      ) : (
        <Card>
          {(loading && !activityLogs.length) || activityPageLoading ? (
            <Spinner label="Loading activity" />
          ) : (
            <>
              <DataTable
                rowKey={(row) => row.id}
                empty={
                  showOfflineState ? (
                    <OfflineState title="Can't load your activity" />
                  ) : (
                    <EmptyState icon="time-outline" title="No activity yet" />
                  )
                }
                columns={[
                  {
                    key: 'timestamp',
                    header: 'When',
                    render: (row) => (
                      <span>
                        <strong>{row.time}</strong>{' '}
                        <span className={styles.muted}>{row.date}</span>
                      </span>
                    ),
                  },
                  {
                    // The outlet only - no appliance name (Oct 2026). The slot
                    // is the one part of a log line that is always true.
                    key: 'outlet',
                    header: 'Outlet',
                    render: (row) => (row.outlet ? `Outlet ${row.outlet}` : 'Outlet'),
                  },
                  {
                    key: 'status',
                    header: 'Action',
                    // Written when the switch is requested. When the Hub never
                    // confirmed it the badge hedges ("ON?") rather than vanishes.
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
                    render: (row) => {
                      const described = describeLogSource(row.source);
                      return <Badge tone={described.tone}>{described.label}</Badge>;
                    },
                  },
                ]}
                rows={activity.rows}
              />
              <Pager
                label="Activity pages"
                page={activityPage}
                totalPages={activity.totalPages}
                busy={loading}
                info={activityTotal
                  ? describeRange({
                    start: activity.start,
                    end: activity.start + activity.rows.length,
                    totalRows: activityTotal,
                  })
                  : null}
                onPrevious={() => setActivityPage((page) => Math.max(1, page - 1))}
                onNext={() => setActivityPage((page) => page + 1)}
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default HistoryPage;
