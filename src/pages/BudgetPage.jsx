import useBudgetTracking from '../screens/BudgetTracking/hooks/useBudgetTracking';
import useRangeUsage from '../screens/BudgetTracking/hooks/useRangeUsage';
import { RangeUsageCard } from '../components/budget/RangeUsageCard';
import { MonthAtAGlance } from '../components/budget/MonthAtAGlance';
import {
  formatCurrency,
  getBudgetStatus,
  getBudgetStatusColor,
} from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Banner, EmptyState, OfflineState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import budgetStyles from './BudgetPage.module.css';

export const BudgetPage = () => {
  const {
    monthlyBudget,
    currentSpending,
    daysInMonth,
    currentDay,
    budgetHistory,
    hasLoaded,
    showOfflineState,
    handleRefresh,
    // handleSetBudget is deliberately not pulled in — see the banner below.
    // Leaving it unbound is what makes setMonthlyBudget unreachable from the
    // web, rather than merely un-clicked.
  } = useBudgetTracking();
  const rangeUsage = useRangeUsage();

  const percentUsed = monthlyBudget > 0 ? (currentSpending / monthlyBudget) * 100 : 0;
  const status = getBudgetStatus(currentSpending, monthlyBudget);
  const statusColor = getBudgetStatusColor(percentUsed);
  const remaining = monthlyBudget - currentSpending;

  // Nothing read yet this session: a spinner, not a ₱0 budget.
  if (!hasLoaded && !showOfflineState) {
    return <Spinner label="Loading budget" />;
  }

  // Every figure below is an assertion about the account - a ₱0 budget, nothing
  // spent, "No monthly budget set yet." With no read behind them they are all
  // zero, which is the empty state of a new account rather than the truth about
  // this one.
  if (showOfflineState) {
    return (
      <div className={styles.page}>
        <div className={styles.pageIntro}>
          <p className={styles.lede}>
            Spending is recomputed from the daily rollups each night, so it never double-counts a
            re-run.
          </p>
        </div>
        <Card>
          <OfflineState onRetry={handleRefresh}>
            Your budget and this month&apos;s spending are stored on your account, and the page
            needs a connection to read them. Nothing has been lost or reset.
          </OfflineState>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <p className={styles.lede}>
          Spending is recomputed from the daily rollups each night, so it never double-counts a
          re-run.
        </p>
      </div>

      {/*
        The amount is set on the phone only — one writer, deliberately.
        `setMonthlyBudget` clears the 50/75/90/100% alert flags when the figure
        changes, because those flags record crossings against a budget that no
        longer exists. Writing from here left them set, and handleBudgetAlerts
        skips any threshold already marked true, so changing the budget on the
        web silenced alerts for the rest of the month while doing it on the
        phone worked. Same account, same action, different outcome.

        Per §12 this is a pointer, not a gate: everything the page shows still
        works here, and nothing about the budget is hidden behind the app.
      */}
      {monthlyBudget <= 0 ? (
        <Banner tone="info" title="No monthly budget set yet.">
          Set one in the Dagitab app to turn on the 50 / 75 / 90 / 100% alerts. It appears here as
          soon as you do.
        </Banner>
      ) : (
        <Banner tone="info">
          Change your monthly budget in the Dagitab app. Everything on this page stays live either
          way.
        </Banner>
      )}

      {/* Same order as the phone: the budget, then any dates, then the month
          at a glance. The stat tiles, Previous months table and By outlet card
          were folded into these (Oct 2026 feedback: simple, one overall view). */}
      <Card>
        <CardHeader
          title="This month"
          subtitle={monthlyBudget > 0 ? status.message : 'Set a budget to track progress'}
        />

        {monthlyBudget > 0 ? (
          <>
            <div className={budgetStyles.progressHead}>
              <span className="ww-num">{formatCurrency(currentSpending)}</span>
              <span className={styles.muted}>of {formatCurrency(monthlyBudget)}</span>
            </div>

            <div
              className={budgetStyles.track}
              role="progressbar"
              aria-valuenow={Math.round(percentUsed)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Budget used"
            >
              <div
                className={budgetStyles.fill}
                style={{
                  width: `${Math.min(100, percentUsed)}%`,
                  background: statusColor,
                }}
              />
            </div>

            <div className={budgetStyles.progressFoot}>
              <span className="ww-num">{percentUsed.toFixed(0)}% used</span>
              <span className="ww-num">
                {remaining >= 0
                  ? `${formatCurrency(remaining)} left`
                  : `${formatCurrency(Math.abs(remaining))} over`}
              </span>
            </div>
          </>
        ) : (
          <EmptyState icon="wallet-outline" title="No budget set">
            Dagitab still records what you spend — a budget just adds the alerts and the
            projection.
          </EmptyState>
        )}
      </Card>

      <RangeUsageCard
        range={rangeUsage.range}
        setRange={rangeUsage.setRange}
        calendarKwh={rangeUsage.calendarKwh}
        onCalendarMonth={rangeUsage.loadCalendarMonth}
        summary={rangeUsage.summary}
        insights={rangeUsage.insights}
        status={rangeUsage.status}
        message={rangeUsage.message}
        onRetry={rangeUsage.reload}
        monthlyBudget={monthlyBudget}
        daysInMonth={daysInMonth}
      />

      <MonthAtAGlance
        monthlyBudget={monthlyBudget}
        currentSpending={currentSpending}
        currentDay={currentDay}
        daysInMonth={daysInMonth}
        budgetHistory={budgetHistory}
      />
    </div>
  );
};

export default BudgetPage;
