import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { foldApplianceRows, priceByEnergyShare } from '../utils/applianceBreakdown';
import { useAnalytics, ANALYTICS_TABS } from '../hooks/useAnalytics';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, Banner, Spinner } from '../components/ui/Feedback';
import UsageChart from '../components/charts/UsageChart';
import BillBreakdown from '../components/analytics/BillBreakdown';
import { Section } from '../components/ui/ListSection';
import { Icon } from '../components/ui/Icon';
import { usePreviousPeriod } from '../hooks/usePreviousPeriod';
import { buildAnalyticsInsights, periodChange } from '../utils/analyticsInsights';
import analyticsStyles from './AnalyticsPage.module.css';
import styles from './page.module.css';
import { PageHero } from '../components/ui/PageHero';

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

  // The period before, for the change tile and the findings.
  const previous = usePreviousPeriod(tab);
  const change = tab === 'Daily' ? null : periodChange(summary.totalEnergy, previous.kwh);
  const insights = buildAnalyticsInsights({
    tab,
    summary,
    series,
    change,
    previousLabel: previous.label,
  });

  const outletTotal = (Number(summary.outlet1Total) || 0) + (Number(summary.outlet2Total) || 0);
  const share = (kwh) => (outletTotal > 0 ? Math.round(((Number(kwh) || 0) / outletTotal) * 100) : 0);
  /*
   * The period's cost split by energy share - the statement's rule, and the
   * phone's Appliance costs card (Oct 2026). The rows used to show each
   * appliance's stored daily costs summed, which are marginal by design and
   * leave out the monthly metering charge, so on Monthly they did not add up
   * to the cost in the hero above them. Folded rather than sliced, so a sixth
   * appliance is an "Other" row instead of vanishing from the total.
   */
  const appliances = priceByEnergyShare(
    foldApplianceRows(summary.applianceUsage || [], 5),
    summary.totalCost,
    summary.totalEnergy
  );
  const usedDays = series.filter((point) => Number(point.total) > 0).length;

  return (
    <div className={styles.page}>
      {/* Organised and analytical (Oct 2026): an overview, the trend, what the
          figures say, where the energy went, and what is running now - each a
          titled block - with the bill folded away at the end. Every finding is
          computed from the period's own figures (analyticsInsights.js, tested). */}
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
      </div>

      <PageHero
        tone={showLive ? 'live' : 'neutral'}
        pulse={showLive}
        label={`Energy ${PERIOD_LABEL[tab]}`}
        value={summary.totalEnergy.toFixed(summary.totalEnergy < 1 ? 3 : 2)}
        unit="kWh"
        stats={[
          { label: 'Cost', value: formatCurrency(summary.totalCost) },
          tab === 'Daily'
            ? { label: 'Peak draw', value: `${summary.peakPowerW.toFixed(0)} W` }
            : { label: 'Per day', value: `${summary.averageUsage.toFixed(summary.averageUsage < 1 ? 3 : 2)} kWh` },
          tab === 'Daily'
            ? { label: 'Yesterday', value: previous.kwh === null ? '—' : `${previous.kwh.toFixed(2)} kWh` }
            : { label: `vs ${previous.label}`, value: change ? `${change.percent > 0 ? '▲' : '▼'} ${Math.abs(change.percent)}%` : '—' },
        ]}
      />

      <Section title="Trend" plain>
        <Card>
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
          {tab !== 'Daily' && summary.peakUsage > 0 ? (
            <p className={analyticsStyles.chartNote}>
              Average <strong className="ww-num">{summary.averageUsage.toFixed(summary.averageUsage < 1 ? 3 : 2)} kWh</strong> a day · busiest{' '}
              <strong>{summary.busiestDay}</strong> at <strong className="ww-num">{summary.peakUsage.toFixed(2)} kWh</strong>
            </p>
          ) : null}
        </Card>
      </Section>

      <div className={styles.pair}>
        <Section title="Findings" plain>
          <Card>
            {insights.length === 0 ? (
              <p className={styles.muted}>Nothing used in this period yet.</p>
            ) : (
              <ul className={analyticsStyles.findings}>
                {insights.map((line) => (
                  <li key={line.text} className={line.tone ? analyticsStyles[line.tone] : ''}>
                    <Icon name={line.icon} />
                    <span>{line.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section title="By outlet" plain>
          <Card>
            {[
              ['Outlet 1', summary.outlet1Total],
              ['Outlet 2', summary.outlet2Total],
            ].map(([label, kwh]) => (
              <div key={label} className={analyticsStyles.split}>
                <div className={analyticsStyles.splitHead}>
                  <span>{label}</span>
                  <span className="ww-num">
                    {(Number(kwh) || 0).toFixed(2)} kWh · {share(kwh)}% · {formatCurrency((summary.totalCost * share(kwh)) / 100)}
                  </span>
                </div>
                <div className={analyticsStyles.track}>
                  <span className={analyticsStyles.fill} style={{ width: `${share(kwh)}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </Section>
      </div>

      <div className={styles.pair}>
        <Section title="Appliance costs" plain>
          <Card>
            {appliances.length === 0 ? (
              <p className={styles.muted}>Name an appliance while it runs and it appears here.</p>
            ) : (
              appliances.map((row) => {
                const pct = Math.round(row.share * 100);
                return (
                  <div key={row.applianceName} className={analyticsStyles.split}>
                    <div className={analyticsStyles.splitHead}>
                      <span>{row.applianceName}</span>
                      <span className="ww-num">{row.energyKwh.toFixed(2)} kWh · {pct}% · {formatCurrency(row.cost)}</span>
                    </div>
                    <div className={analyticsStyles.track}>
                      <span className={analyticsStyles.fill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
            {appliances.length > 0 ? (
              <p className={styles.muted} style={{ fontSize: 12.5 }}>
                The period&apos;s cost split by each appliance&apos;s share of the energy - the same
                split your statement uses.
              </p>
            ) : null}
            <Link to="/appliance-costs" className={styles.linkButton}>
              Cost per hour &amp; calculator →
            </Link>
          </Card>
        </Section>

        <Section title="Right now" plain>
          <Card>
            {!telemetryFresh ? (
              <p className={styles.muted}>No readings from the Hub.</p>
            ) : (
              <div className={styles.stack}>
                {liveAppliances.map((appliance) => (
                  <div key={appliance.outletNumber} className={analyticsStyles.liveRow}>
                    <span>Outlet {appliance.outletNumber}</span>
                    <strong className="ww-num">
                      {appliance.isSwitching
                        ? (appliance.switchingTo === 'off' ? 'Switching off…' : 'Switching on…')
                        : appliance.isDrawing
                          ? `${appliance.powerW.toFixed(1)} W`
                          : appliance.isOn ? 'On · idle' : 'Off'}
                    </strong>
                  </div>
                ))}
                {drawing.length > 0 ? (
                  <div className={analyticsStyles.liveRow}>
                    <span className={styles.muted}>Running cost</span>
                    <strong className="ww-num">{formatCurrency(liveCostPerHour)}/hr</strong>
                  </div>
                ) : null}
              </div>
            )}
            {budgetProjection ? (
              <div className={analyticsStyles.pace}>
                <span className={styles.muted}>Month at this pace</span>
                <strong
                  className="ww-num"
                  style={{ color: budgetProjection.percent > 100 ? 'var(--ww-error)' : 'var(--ww-text-dark)' }}
                >
                  {formatCurrency(budgetProjection.projected)}
                </strong>
                <Badge tone={budgetProjection.percent > 100 ? 'alert' : 'good'}>
                  {budgetProjection.percent > 100 ? 'Over budget' : 'Within budget'}
                </Badge>
              </div>
            ) : null}
          </Card>
        </Section>
      </div>

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
  );
};

export default AnalyticsPage;
