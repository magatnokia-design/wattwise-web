import { useState } from 'react';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { useAnalytics, ANALYTICS_TABS } from '../hooks/useAnalytics';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { StatGrid, StatTile } from '../components/ui/StatTile';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import UsageChart from '../components/charts/UsageChart';
import BillBreakdown from '../components/analytics/BillBreakdown';
import styles from './page.module.css';

const PERIOD_LABEL = {
  Daily: 'today',
  Weekly: 'this week',
  Monthly: 'this month',
};

export const AnalyticsPage = () => {
  const [tab, setTab] = useState('Daily');
  // Folded by default, as on the phone - it is long and rarely the question.
  const [showBill, setShowBill] = useState(false);
  const { outlets, rateProfileId, supplyRates, hasSupplyRates, telemetryFresh } = useLiveOutlets();
  const {
    summary,
    series,
    billDetails,
    liveAppliances,
    budget,
    loading,
    isLive,
    showOfflineState,
  } = useAnalytics({
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
      {/* Simplified (Oct 2026), as on the phone: two figures, the chart, what
          is running now, and the bill folded away. Removed on request: the
          default-rates banner (rates are automatic), "Where the energy went",
          the peak/average and busiest-day tiles, and every caption. */}
      {showOfflineState ? (
        <Banner tone="warn" title="Can't reach Dagitab.">
          These figures could not be loaded.
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
        {showLive ? <Badge tone="good">Live</Badge> : null}
      </div>

      <StatGrid>
        <StatTile
          label={`Energy ${PERIOD_LABEL[tab]}`}
          value={summary.totalEnergy.toFixed(2)}
          unit="kWh"
          tone="primary"
          icon="flash-outline"
        />
        <StatTile
          label={`Cost ${PERIOD_LABEL[tab]}`}
          value={formatCurrency(summary.totalCost)}
          icon="wallet-outline"
        />
      </StatGrid>

      <div className={styles.split}>
        <Card>
          <CardHeader title="Energy by outlet" />
          {loading ? (
            <Spinner label="Loading usage" />
          ) : (
            <UsageChart
              series={series}
              outlet1Name={summary.outlet1Name}
              outlet2Name={summary.outlet2Name}
              // Marginal, not effective: a day's bar must not carry a share
              // of the monthly metering fee it never incurred.
              effectiveRate={summary.marginalRate}
            />
          )}
        </Card>

        <div className={styles.stack}>
          <Card>
            <CardHeader title="Right now" />
            {!telemetryFresh ? (
              <EmptyState icon="cloud-offline-outline" title="No readings from the Hub" />
            ) : (
              <div className={styles.stack}>
                {liveAppliances.map((appliance) => (
                  <div key={appliance.outletNumber} className="ww-live-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ww-text-dark)' }}>
                        Outlet {appliance.outletNumber}
                      </span>
                      <span className="ww-num" style={{ fontWeight: 700 }}>
                        {appliance.isSwitching
                          ? (appliance.switchingTo === 'off' ? 'Switching off…' : 'Switching on…')
                          : appliance.isDrawing
                            ? `${appliance.powerW.toFixed(1)} W`
                            : appliance.isOn ? 'On · idle' : 'Off'}
                      </span>
                    </div>
                  </div>
                ))}
                {drawing.length > 0 ? (
                  <p className={styles.muted}>
                    <span className="ww-num">{formatCurrency(liveCostPerHour)}</span> per hour
                  </p>
                ) : null}
              </div>
            )}
          </Card>

          {budgetProjection ? (
            <Card>
              <p className={styles.muted}>Month at this pace</p>
              <p
                className="ww-num"
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: budgetProjection.percent > 100 ? 'var(--ww-error)' : 'var(--ww-text-dark)',
                }}
              >
                {formatCurrency(budgetProjection.projected)}
              </p>
              <Badge tone={budgetProjection.percent > 100 ? 'alert' : 'good'}>
                {budgetProjection.percent > 100 ? 'Over budget' : 'Within budget'}
              </Badge>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Bill breakdown"
              action={(
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setShowBill((value) => !value)}
                  aria-expanded={showBill}
                >
                  {showBill ? 'Hide' : 'Show'}
                </button>
              )}
            />
            {showBill ? (
              <BillBreakdown bill={billDetails} isEstimate={!hasSupplyRates} />
            ) : (
              <p className="ww-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ww-text-dark)' }}>
                {formatCurrency(summary.totalCost)}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
