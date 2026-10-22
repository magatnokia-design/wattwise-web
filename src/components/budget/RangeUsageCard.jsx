import { Card, CardHeader } from '../ui/Card';
import { Spinner } from '../ui/Feedback';
import { getManilaDateKey } from '../../utils/liveUsage';
import { RANGE_PRESETS } from '../../utils/rangeUsage';
import styles from './RangeUsageCard.module.css';

/**
 * "Check your usage" - any two dates, what was used and what it cost. The web
 * twin of the phone's RangeUsageCard: same hook (useRangeUsage, copied), same
 * arithmetic (rangeUsage.js, copy-rule), so both answer the same question with
 * the same figure. Dates use the browser's own calendar (<input type="date">).
 */

const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;
const kwh = (value) => `${Number(value || 0).toFixed(2)} kWh`;

export const RangeUsageCard = ({ range, setRange, summary, status, message, onRetry, monthlyBudget }) => {
  const today = getManilaDateKey();
  const activePreset = RANGE_PRESETS.find((preset) => {
    const resolved = preset.resolve(today);
    return resolved.startDate === range.startDate && resolved.endDate === range.endDate;
  });

  const hasBudget = monthlyBudget > 0;
  const paceOver = hasBudget && summary.monthPaceCost > monthlyBudget;

  // An emptied date field reports '' - kept as-is so validateRange can say
  // "choose a start date" rather than the field snapping back.
  const onDate = (field) => (event) => {
    const value = event.target.value;
    setRange((current) => ({ ...current, [field]: value }));
  };

  return (
    <Card>
      <CardHeader
        title="Check your usage"
        subtitle="Pick any dates to see how much you used and what it cost."
      />

      <div className={styles.controls}>
        <div className={styles.presets} role="group" aria-label="Quick ranges">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`${styles.chip} ${activePreset?.id === preset.id ? styles.chipActive : ''}`}
              aria-pressed={activePreset?.id === preset.id}
              onClick={() => setRange(preset.resolve(today))}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.dates}>
          <label className={styles.dateField}>
            <span>From</span>
            <input type="date" value={range.startDate} max={today} onChange={onDate('startDate')} />
          </label>
          <label className={styles.dateField}>
            <span>To</span>
            <input type="date" value={range.endDate} max={today} onChange={onDate('endDate')} />
          </label>
        </div>
      </div>

      {status === 'invalid' ? (
        <p className={styles.problem}>{message}</p>
      ) : status === 'offline' ? (
        <p className={styles.problem}>
          These dates could not be loaded. Check your connection.{' '}
          <button type="button" className={styles.retry} onClick={onRetry}>Try again</button>
        </p>
      ) : status === 'loading' ? (
        <Spinner label="Adding up your usage" />
      ) : (
        <>
          <div className={styles.result}>
            <div>
              <span className={styles.resultLabel}>You used</span>
              <strong className={styles.resultValue}>{kwh(summary.totalKwh)}</strong>
            </div>
            <div>
              <span className={styles.resultLabel}>It cost about</span>
              <strong className={`${styles.resultValue} ${styles.resultCost}`}>{peso(summary.cost)}</strong>
            </div>
            <div>
              <span className={styles.resultLabel}>Per day ({summary.days} {summary.days === 1 ? 'day' : 'days'})</span>
              <strong className={styles.resultValue}>{peso(summary.dailyCost)}</strong>
            </div>
          </div>

          <dl className={styles.rows}>
            <div><dt>Outlet 1</dt><dd>{kwh(summary.outlet1Kwh)}</dd></div>
            <div><dt>Outlet 2</dt><dd>{kwh(summary.outlet2Kwh)}</dd></div>
          </dl>

          {summary.days > 0 ? (
            <p className={`${styles.pace} ${paceOver ? styles.paceOver : ''}`}>
              At this rate, a full month costs about {peso(summary.monthPaceCost)}
              {hasBudget
                ? paceOver
                  ? ` — more than your ${peso(monthlyBudget)} budget.`
                  : ` — within your ${peso(monthlyBudget)} budget.`
                : '.'}
            </p>
          ) : null}

          <p className={styles.footnote}>
            {summary.includesToday ? 'Today counts what you have used so far. ' : ''}
            This is the cost of the electricity at your rates. Your bill also adds a small
            monthly meter charge.
          </p>
        </>
      )}
    </Card>
  );
};

export default RangeUsageCard;
