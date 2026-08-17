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

  /*
   * `telemetryFresh` is the single authority for "is this reading current".
   *
   * This page used to carry two notions of live and they disagreed on screen:
   * `isLive` from useAnalytics is `!!liveTodayEntry`, which only asks whether a
   * today-entry could be built from the outlet documents — it has no time
   * component at all. So the moment telemetry paused, the "Right now" panel
   * (gated on telemetryFresh, 12 s) said the hardware was not reporting while
   * the tile beside it still read "Drawing now 59.0 W" from the last values
   * received. The numbers were real; presenting them as current was not.
   *
   * Note this page and Settings legitimately disagree now. Settings tracks
   * device health, which getDeviceCommand refreshes on a command poll; this
   * tracks telemetry, which only updateOutletMetrics writes. "Connected but
   * not sending readings" is a real state, and both readings are true.
   */
  const showLive = isLive && telemetryFresh;

  const drawing = telemetryFresh ? liveAppliances.filter((appliance) => appliance.isDrawing) : [];
  /*
   * `&& !isSwitching` — without it this fires "switched on but drawing nothing"
   * for the whole pending window, up to ~15 s before the relay actually closes.
   * The outlet is not idle, it is mid-command, and `isSwitching` is the only
   * thing that distinguishes "told to come on, hasn't yet" from "on with nothing
   * plugged in". Same premature assertion as the badge, one banner down.
   */
  const idleOn = telemetryFresh
    ? liveAppliances.filter(
        (appliance) => appliance.isOn && !appliance.isDrawing && !appliance.isSwitching
      )
    : [];
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
        {showLive ? <Badge tone="good">Includes today, live</Badge> : null}
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
          /* "Effective" is total/kWh, which is a fair description of a whole
             billing period and a nonsense one for anything shorter — early in a
             period it smears the fixed P5.00 metering charge across whatever
             energy exists, and reported P5,610/kWh. Only Monthly reports it. */
          caption={
            tab === 'Monthly'
              ? `PELCO III · ${formatCurrency(summary.effectiveRate)}/kWh effective`
              : `PELCO III · ${formatCurrency(summary.marginalRate)} per additional kWh`
          }
        />
        {/* Daily shows watts, the other tabs kWh — so label, value and unit are
            set together rather than a shared unit that only fits one of them. */}
        <StatTile
          /* Always the peak on this tab, never the live draw.
             It used to switch to "Drawing now" whenever telemetry was fresh,
             which meant the day's peak only ever rendered once the hardware went
             quiet - the number this tile exists for was hidden for exactly as
             long as the device was working. The peak is a property of the day,
             and this is the page about the day.
             Live draw is not lost: the Dashboard shows it three times over, in
             the combined tile and on both outlet cards. */
          label={tab === 'Daily' ? 'Peak power' : 'Daily average'}
          value={
            tab === 'Daily'
              ? summary.peakPowerW.toFixed(1)
              : summary.averageUsage.toFixed(3)
          }
          unit={tab === 'Daily' ? 'W' : 'kWh'}
          /* `isLive`, not `showLive`: a day still in progress has a peak that can
             still be beaten, and that stays true while the hardware is quiet.
             Gating on freshness would call today's running high final the moment
             telemetry paused. Today's peak hour is deliberately unreported - the
             nightly rollup fills it in from peakPowerTodayAtMs. */
          caption={
            tab === 'Daily'
              ? isLive
                ? 'Highest so far today'
                : summary.peakHour === 'N/A'
                  ? 'Highest of the two outlets'
                  : `Peak hour ${summary.peakHour}`
              : 'Across the period'
          }
        />
        <StatTile
          label="Busiest day"
          value={summary.busiestDay}
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
                /* Each bar is one day, and a day priced at the period's
                   effective rate carries a share of the monthly metering fee it
                   never incurred. Tooltips price marginally. */
                effectiveRate={summary.marginalRate}
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
              <EmptyState icon="📡" title="No readings in the last 12 seconds">
                The ESP32 may still be connected — Settings tracks that separately, because
                checking for commands is silent. This panel only fills in while readings are
                actually arriving. Toggling an outlet usually starts them again.
              </EmptyState>
            ) : (
              <div className={styles.stack}>
                {liveAppliances.map((appliance) => (
                  <div key={appliance.outletNumber} className="ww-live-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ww-text-dark)' }}>
                        {appliance.displayLabel || appliance.applianceName}
                      </span>
                      {/* Switching outranks both: during that window neither the
                          commanded state nor the meter is the whole truth, and
                          the transition is what is actually happening. */}
                      <Badge
                        tone={
                          appliance.isSwitching
                            ? 'warn'
                            : appliance.isDrawing
                              ? 'good'
                              : appliance.isOn
                                ? 'warn'
                                : 'neutral'
                        }
                      >
                        {appliance.isSwitching
                          ? appliance.switchingTo === 'off'
                            ? 'Switching off…'
                            : 'Switching on…'
                          : appliance.isDrawing
                            ? 'Drawing'
                            : appliance.isOn
                              ? 'Idle'
                              : 'Off'}
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
