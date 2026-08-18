import { useEffect, useState } from 'react';
import { useHistory } from '../screens/History/hooks/useHistory';
import {
  DATE_RANGE_PRESETS,
  describeLogDelivery,
  describeLogSource,
  filterByDateRange,
  formatCost,
  formatKwh,
  formatWatts,
  getTimestampMs,
  powerAtSwitch,
  resolveDateRange,
} from '../screens/History/utils/historyHelpers';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { SelectField } from '../components/ui/Field';
import { Badge, EmptyState, Spinner } from '../components/ui/Feedback';
import ExportUsageButton from '../components/history/ExportUsageButton';
import styles from './page.module.css';

/*
 * How many switch events the live listener holds, and how much further each
 * "Load more" reaches.
 *
 * This used to be a bare 50 passed at the call site, and it was quietly the
 * whole answer to "why does History only show yesterday?". The listener is
 * capped by *count* and carries no date clause at all - the Range control is
 * applied afterwards, in the browser, by filterByDateRange. So "This month"
 * only ever meant "of the last 50 switches, the ones from this month", and
 * during heavy testing 50 switches can be a day and a half. Picking a wider
 * range changed nothing, because the older rows had never been fetched.
 *
 * Matching the phone app's arrangement: raise the cap and re-subscribe, rather
 * than run a second paginated query alongside a live one. Growing the live
 * query keeps realtime updates working; a separate fetch would fight it.
 */
const ACTIVITY_PAGE_SIZE = 50;

const TABS = [
  { id: 'usage', label: 'Daily usage' },
  { id: 'activity', label: 'Activity log' },
];

const OUTLET_OPTIONS = [
  { value: 'all', label: 'Both outlets' },
  { value: '1', label: 'Outlet 1' },
  { value: '2', label: 'Outlet 2' },
];

const RANGE_OPTIONS = DATE_RANGE_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

export const HistoryPage = () => {
  const [tab, setTab] = useState('usage');
  const [outlet, setOutlet] = useState('all');
  const [range, setRange] = useState('30d');

  const [logLimit, setLogLimit] = useState(ACTIVITY_PAGE_SIZE);

  const { activityLogs, usageHistory, loading, hasMore, fetchUsageHistory, subscribeActivityLogs } =
    useHistory();

  // A new filter starts a fresh window. Without this, narrowing to one outlet
  // after several "Load more" taps would keep re-subscribing at the grown cap.
  useEffect(() => {
    setLogLimit(ACTIVITY_PAGE_SIZE);
  }, [outlet, range]);

  // Daily usage is filtered server-side by historyService.getDailyUsage.
  useEffect(() => {
    const { startDate, endDate } = resolveDateRange(range);
    fetchUsageHistory(startDate, endDate);
  }, [range, fetchUsageHistory]);

  // Activity logs stream live — a toggle from the phone shows up here without
  // a refresh, which is the same listener the phone app uses. Only while the
  // tab is actually showing, though: HistoryScreen.js guards it the same way,
  // and without the guard the listener is opened on mount and never detached.
  useEffect(() => {
    if (tab !== 'activity') return undefined;

    const unsubscribe = subscribeActivityLogs({ outlet }, logLimit);
    return () => unsubscribe();
  }, [tab, outlet, logLimit, subscribeActivityLogs]);

  const { startDate, endDate } = resolveDateRange(range);
  const visibleLogs = filterByDateRange(activityLogs, startDate, endDate);
  // The badge alone explains one row. This says what the whole column means, and
  // only appears when there is something to explain.
  const hasUnconfirmed = visibleLogs.some((row) => describeLogDelivery(row));

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

        <div className={styles.row}>
          <SelectField
            label="Range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            options={RANGE_OPTIONS}
          />
          {tab === 'activity' ? (
            <SelectField
              label="Outlet"
              value={outlet}
              onChange={(event) => setOutlet(event.target.value)}
              options={OUTLET_OPTIONS}
            />
          ) : null}
        </div>
      </div>

      {tab === 'usage' ? (
        <Card>
          <CardHeader
            title="Daily usage"
            subtitle="One row per day, written by the midnight rollup. Today is assembled live from the outlets."
            action={<ExportUsageButton usage={usageHistory} />}
          />
          {loading && !usageHistory.length ? (
            <Spinner label="Loading usage history" />
          ) : (
            <DataTable
              rowKey={(row) => row.date}
              defaultSort={{ key: 'date', direction: 'desc' }}
              // One row per day, so a 90-day range is the only one that overruns
              // a screen. Same page size keeps the two tabs feeling alike.
              pageSize={15}
              resetKey={range}
              empty={
                <EmptyState icon="📋" title="No days recorded in this range">
                  A day appears here after the midnight rollup, or immediately once the hardware
                  starts reporting today.
                </EmptyState>
              }
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  sortable: true,
                  render: (row) => (
                    <span className={styles.row}>
                      <strong>
                        {row.day} {row.month}
                      </strong>
                      {row.isLive ? <Badge tone="good">Live</Badge> : null}
                    </span>
                  ),
                },
                {
                  key: 'outlet1Kwh',
                  header: 'Outlet 1',
                  align: 'right',
                  sortable: true,
                  render: (row) => <span className="ww-num">{formatKwh(row.outlet1Kwh)}</span>,
                },
                {
                  key: 'outlet2Kwh',
                  header: 'Outlet 2',
                  align: 'right',
                  sortable: true,
                  render: (row) => <span className="ww-num">{formatKwh(row.outlet2Kwh)}</span>,
                },
                {
                  key: 'totalKwh',
                  header: 'Total',
                  align: 'right',
                  sortable: true,
                  render: (row) => (
                    <strong className="ww-num">{formatKwh(row.totalKwh)}</strong>
                  ),
                },
                {
                  key: 'peakPower',
                  header: 'Peak',
                  align: 'right',
                  sortable: true,
                  sortValue: (row) => Number(row.peakPower) || 0,
                  render: (row) => (
                    <span className="ww-num">{formatWatts(row.peakPower) || '—'}</span>
                  ),
                },
                {
                  key: 'totalCost',
                  header: 'Cost',
                  align: 'right',
                  sortable: true,
                  render: (row) => (
                    <strong className="ww-num">{formatCost(row.totalCost)}</strong>
                  ),
                },
              ]}
              rows={usageHistory}
            />
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Activity log"
            subtitle="Every switch, wherever it came from — this browser, the phone, a timer, or the safety cutoff."
          />
          {loading && !visibleLogs.length ? (
            <Spinner label="Loading activity" />
          ) : (
            <DataTable
              rowKey={(row) => row.id}
              defaultSort={{ key: 'timestamp', direction: 'desc' }}
              /*
               * A busy day puts 30-odd switches in here and the listener pulls
               * 50, so the log ran well past a screen. Paged rather than capped:
               * every entry is still reachable, which matters because this table
               * is the record of what the hardware actually did.
               *
               * resetKey is the filter pair, so changing range or outlet starts
               * at the top. A log arriving live does not — this listener streams,
               * and being pulled back to page 1 mid-read is worse than a stale
               * page number, which resolvePage clamps.
               */
              pageSize={15}
              resetKey={`${range}:${outlet}`}
              empty={
                <EmptyState icon="🕓" title="No activity in this range">
                  Toggling an outlet writes a log entry here.
                </EmptyState>
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
                { key: 'outletName', header: 'Outlet', sortable: true },
                {
                  key: 'status',
                  header: 'Action',
                  /*
                   * The row is written when the switch is *requested* - the hub
                   * only finds out when it next polls. So this column has always
                   * meant "what was asked for", and read as "what the relay did".
                   * Identical, until the hub is off the network: then the table
                   * states flatly that an outlet switched when nothing did.
                   *
                   * When the command times out the backend stamps the row, and
                   * the badge hedges rather than disappears. The request is still
                   * a true record of what the user asked for; what is unknown is
                   * only whether the relay followed.
                   */
                  render: (row) => {
                    const delivery = describeLogDelivery(row);
                    if (!delivery) {
                      return (
                        <Badge tone={row.status === 'ON' ? 'good' : 'neutral'}>{row.status}</Badge>
                      );
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
                {
                  key: 'power',
                  // "Power" alone invited the reading that every row should have
                  // one. Only a switch-off can: the header now says which moment
                  // the figure belongs to, and powerAtSwitch enforces it.
                  header: 'Power at switch',
                  align: 'right',
                  sortable: true,
                  sortValue: powerAtSwitch,
                  render: (row) => (
                    <span className="ww-num">{formatWatts(powerAtSwitch(row)) || '—'}</span>
                  ),
                },
              ]}
              rows={visibleLogs}
            />
          )}

          {/* Says plainly what the range can and cannot reach. The control looks
              authoritative — pick "This month" and the table answers — so
              without this a short log reads as "nothing else happened", when it
              actually means "nothing else was fetched". */}
          {!loading || visibleLogs.length ? (
            <div className={styles.logFooter}>
              <p className={styles.logNote}>
                {hasMore
                  ? `The ${activityLogs.length} most recent switches are loaded. The range filters
                     these — it does not search further back, so older days need loading first.`
                  : `All ${activityLogs.length} recorded switches are loaded.`}
                {hasUnconfirmed
                  ? ' A row marked “Not confirmed” means the hub never answered that command, so'
                    + ' the outlet may not have changed. Every other row was acknowledged by the'
                    + ' hardware.'
                  : ''}
              </p>

              {hasMore ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loading}
                  onClick={() => setLogLimit((current) => current + ACTIVITY_PAGE_SIZE)}
                >
                  Load {ACTIVITY_PAGE_SIZE} more
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};

export default HistoryPage;
