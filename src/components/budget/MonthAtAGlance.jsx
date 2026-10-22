import { Card, CardHeader } from '../ui/Card';
import { summarizeMonth } from '../../screens/BudgetTracking/utils/budgetHelpers';
import { getManilaDateKey } from '../../utils/liveUsage';
import styles from './MonthAtAGlance.module.css';

/**
 * "This month at a glance" - where the month is heading, what is safe to spend
 * per day, and the last three months. The web twin of the phone's
 * MonthAtAGlance, from the same summarizeMonth (budgetHelpers.js, copy-rule).
 * Replaced the stat tiles, the Previous months table and the By outlet card
 * (Oct 2026 feedback: one simple overall view).
 */

const STATUS = {
  'on-track': { label: 'On track', tone: styles.onTrack },
  'at-risk': { label: 'Heading over', tone: styles.atRisk },
  over: { label: 'Over budget', tone: styles.over },
  none: { label: 'No budget yet', tone: styles.none },
};

const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;

export const MonthAtAGlance = ({ monthlyBudget, currentSpending, currentDay, daysInMonth, budgetHistory = [] }) => {
  const month = summarizeMonth({ monthlyBudget, currentSpending, currentDay, daysInMonth });
  const status = STATUS[month.status];

  const headline = {
    'on-track': `At this pace you will finish the month at ${peso(month.projected)}, ${peso(month.projectedDifference)} under your budget.`,
    'at-risk': `At this pace you will finish at ${peso(month.projected)}, ${peso(month.projectedDifference)} over your budget.`,
    over: `You have spent ${peso(-month.remaining)} more than your ${peso(monthlyBudget)} budget this month.`,
    none: `At this pace the month will cost about ${peso(month.projected)}. Set a budget in the app to track it.`,
  }[month.status];

  const months = [...budgetHistory].reverse();
  const tallest = Math.max(1, ...months.map((m) => Math.max(m.spent, m.budget || 0)));
  // Manila, not UTC: from midnight to 8 AM on the 1st, UTC is still last month.
  const currentKey = getManilaDateKey().slice(0, 7);
  const anyBudget = months.some((m) => m.budget > 0);

  return (
    <Card>
      <CardHeader
        title="This month at a glance"
        action={<span className={`${styles.pill} ${status.tone}`}>{status.label}</span>}
      />

      <p className={styles.headline}>{headline}</p>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span>Daily average</span>
          <strong>{peso(month.dailyAverage)}</strong>
        </div>
        <div className={styles.tile}>
          <span>End of month</span>
          <strong>{peso(month.projected)}</strong>
        </div>
        {monthlyBudget > 0 ? (
          <div className={`${styles.tile} ${styles.tileStrong}`}>
            <span>Safe per day</span>
            <strong>{peso(month.safeDaily)}</strong>
            <small>{month.daysLeft} {month.daysLeft === 1 ? 'day' : 'days'} left</small>
          </div>
        ) : (
          <div className={styles.tile}>
            <span>Days left</span>
            <strong>{month.daysLeft}</strong>
          </div>
        )}
      </div>

      {months.length > 0 ? (
        <div className={styles.history}>
          <h3>Last {months.length} months</h3>
          {months.map((m) => {
            const over = m.budget > 0 && m.spent > m.budget;
            const tone = m.budget > 0 ? (over ? styles.barOver : styles.barUnder) : styles.barNoBudget;
            return (
              <div key={m.monthKey || m.id} className={styles.barRow}>
                <span className={styles.barLabel}>{m.month}</span>
                <div className={styles.barTrack}>
                  <div className={`${styles.barFill} ${tone}`} style={{ width: `${(m.spent / tallest) * 100}%` }} />
                  {m.budget > 0 ? (
                    <div className={styles.budgetMark} style={{ left: `${(m.budget / tallest) * 100}%` }} />
                  ) : null}
                </div>
                <span className={styles.barValue}>
                  {peso(m.spent)}{m.monthKey === currentKey ? ' so far' : ''}
                  {m.isFinal ? <em className={styles.final}>Final</em> : null}
                </span>
              </div>
            );
          })}
          {anyBudget ? <p className={styles.legend}>The thin line on a bar is that month&apos;s budget.</p> : null}
        </div>
      ) : null}

      <p className={styles.alerts}>
        {monthlyBudget > 0
          ? 'You will get an alert at 50%, 75%, 90% and 100% of your budget.'
          : 'Set a budget in the app to get alerts at 50%, 75%, 90% and 100% of it.'}
      </p>
    </Card>
  );
};

export default MonthAtAGlance;
