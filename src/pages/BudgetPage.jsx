import useBudgetTracking from '../screens/BudgetTracking/hooks/useBudgetTracking';
import {
  formatCurrency,
  getBudgetStatus,
  getBudgetStatusColor,
} from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { StatGrid, StatTile } from '../components/ui/StatTile';
import { DataTable } from '../components/ui/DataTable';
import { Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import budgetStyles from './BudgetPage.module.css';

export const BudgetPage = () => {
  const {
    monthlyBudget,
    currentSpending,
    outlet1Spending,
    outlet2Spending,
    dailyAverage,
    projectedCost,
    daysInMonth,
    currentDay,
    budgetHistory,
    loading,
    // handleSetBudget is deliberately not pulled in — see the banner below.
    // Leaving it unbound is what makes setMonthlyBudget unreachable from the
    // web, rather than merely un-clicked.
  } = useBudgetTracking();

  const percentUsed = monthlyBudget > 0 ? (currentSpending / monthlyBudget) * 100 : 0;
  const status = getBudgetStatus(currentSpending, monthlyBudget);
  const statusColor = getBudgetStatusColor(percentUsed);
  const remaining = monthlyBudget - currentSpending;

  if (loading && monthlyBudget === 0 && currentSpending === 0) {
    return <Spinner label="Loading budget" />;
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
          Set one in the WattWise app to turn on the 50 / 75 / 90 / 100% alerts. It appears here as
          soon as you do.
        </Banner>
      ) : (
        <Banner tone="info">
          Change your monthly budget in the WattWise app. Everything on this page stays live either
          way.
        </Banner>
      )}

      <StatGrid>
        <StatTile label="Monthly budget" value={formatCurrency(monthlyBudget)} icon="🎯" />
        <StatTile
          label="Spent so far"
          value={formatCurrency(currentSpending)}
          tone="primary"
          caption={`Day ${currentDay} of ${daysInMonth}`}
        />
        <StatTile
          label="Projected"
          value={formatCurrency(projectedCost)}
          tone={monthlyBudget > 0 && projectedCost > monthlyBudget ? 'danger' : 'default'}
          caption="At the current daily pace"
        />
        <StatTile
          label="Daily average"
          value={formatCurrency(dailyAverage)}
          caption="Across the month so far"
        />
      </StatGrid>

      <div className={styles.split}>
        <div className={styles.stack}>
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
              <EmptyState icon="💰" title="No budget set">
                WattWise still records what you spend — a budget just adds the alerts and the
                projection.
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader title="Previous months" subtitle="Spend against the budget in force then." />
            <DataTable
              rowKey={(row) => row.id}
              empty={<EmptyState icon="📅" title="No earlier months recorded yet" />}
              columns={[
                {
                  key: 'month',
                  header: 'Month',
                  render: (row) => `${row.month} ${row.year}`,
                },
                {
                  key: 'budget',
                  header: 'Budget',
                  align: 'right',
                  sortable: true,
                  render: (row) => (
                    <span className="ww-num">
                      {row.budget > 0 ? formatCurrency(row.budget) : '—'}
                    </span>
                  ),
                },
                {
                  key: 'spent',
                  header: 'Spent',
                  align: 'right',
                  sortable: true,
                  render: (row) => <span className="ww-num">{formatCurrency(row.spent)}</span>,
                },
                {
                  key: 'delta',
                  header: 'Result',
                  align: 'right',
                  sortValue: (row) => row.spent - row.budget,
                  render: (row) => {
                    if (row.budget <= 0) return <span className={styles.muted}>No budget</span>;
                    const over = row.spent > row.budget;
                    return (
                      <span
                        className="ww-num"
                        style={{
                          color: over ? 'var(--ww-error)' : 'var(--ww-primary-dark)',
                          fontWeight: 600,
                        }}
                      >
                        {over ? '+' : '−'}
                        {formatCurrency(Math.abs(row.spent - row.budget))}
                      </span>
                    );
                  },
                },
              ]}
              rows={budgetHistory}
            />
          </Card>
        </div>

        <Card>
          <CardHeader title="By outlet" subtitle="This month's spend, split." />
          <div className={styles.stack}>
            {[
              { label: 'Outlet 1', value: outlet1Spending, color: 'var(--ww-series-1)' },
              { label: 'Outlet 2', value: outlet2Spending, color: 'var(--ww-series-2)' },
            ].map((entry) => {
              const total = outlet1Spending + outlet2Spending;
              const share = total > 0 ? (entry.value / total) * 100 : 0;

              return (
                <div key={entry.label}>
                  <div className={budgetStyles.outletRow}>
                    <span className={styles.row}>
                      <span
                        className={budgetStyles.swatch}
                        style={{ background: entry.color }}
                        aria-hidden="true"
                      />
                      {entry.label}
                    </span>
                    <strong className="ww-num">{formatCurrency(entry.value)}</strong>
                  </div>
                  <div className={budgetStyles.track}>
                    <div
                      className={budgetStyles.fill}
                      style={{ width: `${share}%`, background: entry.color }}
                    />
                  </div>
                  <p className={budgetStyles.outletShare}>
                    <span className="ww-num">{share.toFixed(0)}%</span> of this month
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

    </div>
  );
};

export default BudgetPage;
