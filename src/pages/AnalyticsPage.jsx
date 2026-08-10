import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { useAnalytics, ANALYTICS_TABS } from '../hooks/useAnalytics';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { StatGrid, StatTile } from '../components/ui/StatTile';
import { DataTable } from '../components/ui/DataTable';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import UsageChart from '../components/charts/UsageChart';
import BillBreakdown from '../components/analytics/BillBreakdown';
import styles from './page.module.css';

const PERIOD_LABEL = {
  Daily: 'today',
  Weekly: 'the last 7 days',
  Monthly: 'this month',
};

export const AnalyticsPage = () => {
  const [tab, setTab] = useState('Daily');
  const { outlets, rateProfileId, supplyRates, hasSupplyRates, telemetryFresh } = useLiveOutlets();
  const { summary, series, billDetails, liveAppliances, budget, loading, isLive } = useAnalytics({
    tab,
    outlets,
    rateProfileId,
    supplyRates,
  });

  const drawing = liveAppliances.filter((appliance) => appliance.isDrawing);
  const idleOn = liveAppliances.filter((appliance) => appliance.isOn && !appliance.isDrawing);
  const liveCostPerHour = drawing.reduce((sum, appliance) => sum + appliance.costPerHour, 0);
  const livePower = drawing.reduce((sum, appliance) => sum + appliance.powerW, 0);

  const budgetProjection = (() => {
    const monthlyBudget = Number(budget.monthlyBudget) || 0;
    const currentSpending = Number(budget.currentSpending) || 0;
    if (monthlyBudget <= 0 || currentSpending <= 0) return null;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projected = (currentSpending / now.getDate()) * daysInMonth;

    return { projected, percent: (projected / monthlyBudget) * 100, monthlyBudget };
  })();

  return (
    <div className={styles.page}>
      {!hasSupplyRates ? (
        <Banner tone="warn" title="Priced with default rates.">
          These totals are estimates until you enter your own PELCO III generation and transmission
          rates. <Link to="/settings">Set them in Settings →</Link>
        </Banner>
      ) : null}

      <div className={styles.pageIntro}>
        <div className={styles.tabs} role="tablist" aria-label="Period">
          {ANALYTICS_TABS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              className={`${styles.tab} ${tab === option ? styles.tabActive : ''}`}
              onClick={() => setTab(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {isLive ? <Badge tone="good">Includes today, live</Badge> : null}
      </div>

      <StatGrid>
        <StatTile
          label="Energy"
          value={summary.totalEnergy.toFixed(3)}
          unit="kWh"
          tone="primary"
          caption={`Measured ${PERIOD_LABEL[tab]}`}
        />
        <StatTile
          label="Cost"
          value={formatCurrency(summary.totalCost)}
          caption={`PELCO III · ${formatCurrency(summary.effectiveRate)}/kWh effective`}
        />
        <StatTile
          label={tab === 'Daily' ? 'Peak power' : 'Daily average'}
          value={
            tab === 'Daily'
              ? summary.totalEnergy.toFixed(3)
              : summary.averageUsage.toFixed(3)
          }
          unit="kWh"
          caption={tab === 'Daily' ? `Peak hour ${summary.peakHour}` : 'Across the period'}
        />
        <StatTile
          label="Busiest day"
          value={summary.bestDay}
          caption={
            summary.peakUsage > 0 ? `${summary.peakUsage.toFixed(3)} kWh on that day` : 'No data yet'
          }
        />
      </StatGrid>

      <div className={styles.split}>
        <div className={styles.stack}>
          <Card>
            <CardHeader
              title={`Energy by outlet — ${PERIOD_LABEL[tab]}`}
              subtitle="Stacked so the day's total and its split read at once."
            />
            {loading ? (
              <Spinner label="Loading usage" />
            ) : (
              <UsageChart
                series={series}
                outlet1Name={summary.outlet1Name}
                outlet2Name={summary.outlet2Name}
                effectiveRate={summary.effectiveRate}
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Where the energy went"
              subtitle="Rolled up from the appliance names recorded on each day."
            />
            <DataTable
              rowKey={(row) => row.applianceName}
              defaultSort={{ key: 'energyKwh', direction: 'desc' }}
              empty={
                <EmptyState icon="🔌" title="No appliance breakdown yet">
                  Name the appliance on each outlet and WattWise attributes usage to it from the
                  next rollup.
                </EmptyState>
              }
              columns={[
                { key: 'applianceName', header: 'Appliance', sortable: true },
                {
                  key: 'energyKwh',
                  header: 'Energy',
                  align: 'right',
                  sortable: true,
                  render: (row) => (
                    <span className="ww-num">{row.energyKwh.toFixed(3)} kWh</span>
                  ),
                },
                {
                  key: 'share',
                  header: 'Share',
                  align: 'right',
                  sortable: true,
                  sortValue: (row) => row.energyKwh,
                  render: (row) => (
                    <span className="ww-num">
                      {summary.totalEnergy > 0
                        ? `${((row.energyKwh / summary.totalEnergy) * 100).toFixed(0)}%`
                        : '—'}
                    </span>
                  ),
                },
                {
                  key: 'cost',
                  header: 'Cost',
                  align: 'right',
                  sortable: true,
                  render: (row) => <span className="ww-num">{formatCurrency(row.cost)}</span>,
                },
              ]}
              rows={summary.applianceUsage}
            />
          </Card>
        </div>

        <div className={styles.stack}>
          <Card>
            <CardHeader title="Right now" subtitle="What is drawing power at this moment." />
            {!telemetryFresh ? (
              <EmptyState icon="📡" title="Hardware is not reporting">
                Live figures appear as soon as the ESP32 posts telemetry.
              </EmptyState>
            ) : (
              <div className={styles.stack}>
                {liveAppliances.map((appliance) => (
                  <div key={appliance.outletNumber} className="ww-live-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ww-text-dark)' }}>
                        {appliance.applianceName}
                      </span>
                      <Badge tone={appliance.isDrawing ? 'good' : appliance.isOn ? 'warn' : 'neutral'}>
                        {appliance.isDrawing ? 'Drawing' : appliance.isOn ? 'Idle' : 'Off'}
                      </Badge>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: 12.5,
                        color: 'var(--ww-text-light)',
                        marginTop: 4,
                      }}
                    >
                      <span className="ww-num">{appliance.powerW.toFixed(1)} W</span>
                      <span className="ww-num">{appliance.energyKwh.toFixed(3)} kWh today</span>
                      <span className="ww-num">{formatCurrency(appliance.costPerHour)}/hr</span>
                    </div>
                  </div>
                ))}

                {drawing.length > 0 ? (
                  <p className={styles.muted}>
                    Drawing <strong className="ww-num">{livePower.toFixed(1)} W</strong> combined —
                    about <strong className="ww-num">{formatCurrency(liveCostPerHour)}</strong> per
                    hour if it keeps running.
                  </p>
                ) : null}

                {idleOn.length > 0 ? (
                  <Banner tone="warn">
                    Outlet {idleOn.map((appliance) => appliance.outletNumber).join(' and ')}{' '}
                    {idleOn.length > 1 ? 'are' : 'is'} switched on but drawing nothing.
                  </Banner>
                ) : null}
              </div>
            )}
          </Card>

          {budgetProjection ? (
            <Card>
              <CardHeader title="Month-end projection" subtitle="At the current daily pace." />
              <StatTile
                label="Projected spend"
                value={formatCurrency(budgetProjection.projected)}
                tone={budgetProjection.percent > 100 ? 'danger' : 'primary'}
                caption={
                  budgetProjection.percent > 100
                    ? `${(budgetProjection.percent - 100).toFixed(0)}% over your ${formatCurrency(
                        budgetProjection.monthlyBudget
                      )} budget`
                    : `${budgetProjection.percent.toFixed(0)}% of your ${formatCurrency(
                        budgetProjection.monthlyBudget
                      )} budget`
                }
              />
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="PELCO III breakdown"
              subtitle={`How ${formatCurrency(summary.totalCost)} is arrived at.`}
            />
            <BillBreakdown bill={billDetails} isEstimate={!hasSupplyRates} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
