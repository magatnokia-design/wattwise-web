import { useState } from 'react';
import useBudgetTracking from '../screens/BudgetTracking/hooks/useBudgetTracking';
import {
  formatCurrency,
  getBudgetStatus,
  getBudgetStatusColor,
} from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/Field';
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
    handleSetBudget,
  } = useBudgetTracking();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const percentUsed = monthlyBudget > 0 ? (currentSpending / monthlyBudget) * 100 : 0;
  const status = getBudgetStatus(currentSpending, monthlyBudget);
  const statusColor = getBudgetStatusColor(percentUsed);
  const remaining = monthlyBudget - currentSpending;

  const openEditor = () => {
    setDraft(monthlyBudget > 0 ? String(monthlyBudget) : '');
    setError('');
    setOpen(true);
  };

  const save = async () => {
    const amount = parseFloat(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a budget above zero.');
      return;
    }

    setSaving(true);
    const result = await handleSetBudget(amount);
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not save the budget.');
      return;
    }

    setOpen(false);
  };

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
        <Button onClick={openEditor}>{monthlyBudget > 0 ? 'Change budget' : 'Set budget'}</Button>
      </div>

      {monthlyBudget <= 0 ? (
        <Banner tone="info">
          No monthly budget set yet. Setting one turns on the 50 / 75 / 90 / 100% alerts.
        </Banner>
      ) : null}

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
                        {formatCurrency(Math.abs(row.spent - row.budget)).replace('₱', '₱')}
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Monthly budget"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {error ? <Banner tone="alert">{error}</Banner> : null}
          <TextField
            label="Budget for this month"
            type="number"
            min="0"
            step="1"
            prefix="₱"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            hint="Carried forward to future months until you change it."
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default BudgetPage;
