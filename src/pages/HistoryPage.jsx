import { useEffect, useState } from 'react';
import { useHistory } from '../screens/History/hooks/useHistory';
import {
  DATE_RANGE_PRESETS,
  describeLogSource,
  filterByDateRange,
  formatCost,
  formatKwh,
  formatWatts,
  getTimestampMs,
  resolveDateRange,
} from '../screens/History/utils/historyHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { DataTable } from '../components/ui/DataTable';
import { SelectField } from '../components/ui/Field';
import { Badge, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';

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

  const { activityLogs, usageHistory, loading, fetchUsageHistory, subscribeActivityLogs } =
    useHistory();

  // Daily usage is filtered server-side by historyService.getDailyUsage.
  useEffect(() => {
    const { startDate, endDate } = resolveDateRange(range);
    fetchUsageHistory(startDate, endDate);
  }, [range, fetchUsageHistory]);

  // Activity logs stream live — a toggle from the phone shows up here without
  // a refresh, which is the same listener the phone app uses.
  useEffect(() => {
    const unsubscribe = subscribeActivityLogs({ outlet }, 50);
    return () => unsubscribe();
  }, [outlet, subscribeActivityLogs]);

  const { startDate, endDate } = resolveDateRange(range);
  const visibleLogs = filterByDateRange(activityLogs, startDate, endDate);

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
          />
          {loading && !usageHistory.length ? (
            <Spinner label="Loading usage history" />
          ) : (
            <DataTable
              rowKey={(row) => row.date}
              defaultSort={{ key: 'date', direction: 'desc' }}
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
                  render: (row) => (
                    <Badge tone={row.status === 'ON' ? 'good' : 'neutral'}>{row.status}</Badge>
                  ),
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
                  header: 'Power',
                  align: 'right',
                  sortable: true,
                  sortValue: (row) => Number(row.power) || 0,
                  render: (row) => <span className="ww-num">{formatWatts(row.power) || '—'}</span>,
                },
              ]}
              rows={visibleLogs}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default HistoryPage;
