import { Card, CardHeader } from '../ui/Card';
import { Spinner } from '../ui/Feedback';
import { getManilaDateKey } from '../../utils/liveUsage';
import { RANGE_PRESETS, buildBudgetTips } from '../../utils/rangeUsage';
import styles from './RangeUsageCard.module.css';

/**
 * "Check your usage" - any dates, or one day: what was used, what it cost,
 * what stands out, and tips worked out from those figures. The web twin of
 * the phone's RangeUsageCard: same hook (useRangeUsage) and the same
 * rangeUsage.js (copy-rule, tested in both repos), so both clients say the
 * same thing about the same dates. Per-outlet rows were removed on request.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (key) => {
  const [, m, d] = String(key).split('-').map(Number);
  return m && d ? `${MONTHS[m - 1]} ${d}` : '--';
};
const formatHour = (hour) => {
  const h = Number(hour);
  if (!Number.isFinite(h)) return null;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
};
const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;
const kwh = (value) => `${Number(value || 0).toFixed(2)} kWh`;

export const RangeUsageCard = ({
  range,
  setRange,
  summary,
  insights,
  status,
  message,
  onRetry,
  monthlyBudget,
  daysInMonth,
}) => {
  const today = getManilaDateKey();
  const isSingleDay = range.startDate === range.endDate;
  const activePreset = isSingleDay
    ? 'day'
    : RANGE_PRESETS.find((preset) => {
      const resolved = preset.resolve(today);
      return resolved.startDate === range.startDate && resolved.endDate === range.endDate;
    })?.id;

  const hasBudget = monthlyBudget > 0;
  const paceOver = hasBudget && summary.monthPaceCost > monthlyBudget;
  const tips = status === 'ready' ? buildBudgetTips(summary, insights, { monthlyBudget, daysInMonth }) : [];

  // An emptied date field reports '' - kept so validateRange can say "choose a
  // start date" rather than the field snapping back.
  const onDate = (field) => (event) => {
    const value = event.target.value;
    setRange((current) => ({ ...current, [field]: value }));
  };
  const onDay = (event) => {
    const value = event.target.value;
    setRange({ startDate: value, endDate: value });
  };

  const periodWord = summary.days === 1 ? 'the day before' : `the ${summary.days} days before`;
  const facts = [];
  if (insights?.change) {
    const { percent, previousCost } = insights.change;
    facts.push({
      tone: percent > 0 ? 'up' : 'down',
      text: percent === 0
        ? `Same as ${periodWord} (${peso(previousCost)}).`
        : `${Math.abs(percent)}% ${percent > 0 ? 'more' : 'less'} than ${periodWord} (${peso(previousCost)}).`,
    });
  }
  if (insights?.day?.peakPower > 0) {
    const hour = formatHour(insights.day.peakHour);
    facts.push({ text: `Highest draw was ${insights.day.peakPower.toFixed(0)} W${hour ? ` around ${hour}` : ''}.` });
  }
  if (insights?.topAppliance) {
    const top = insights.topAppliance;
    facts.push({ text: `${top.name} used ${top.share}% of the energy (${peso(top.cost)}).` });
  }
  if (insights?.busiest) {
    facts.push({ text: `Busiest day: ${shortDate(insights.busiest.date)} — ${peso(insights.busiest.cost)}.` });
  }
  if (insights?.quietest && insights.quietest.date !== insights.busiest?.date) {
    facts.push({ text: `Quietest day: ${shortDate(insights.quietest.date)} — ${peso(insights.quietest.cost)}.` });
  }

  return (
    <Card>
      <CardHeader
        title="Check your usage"
        subtitle="Pick dates, or one day, to see what you used and how to save."
      />

      <div className={styles.controls}>
        <div className={styles.presets} role="group" aria-label="Quick ranges">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`${styles.chip} ${activePreset === preset.id ? styles.chipActive : ''}`}
              aria-pressed={activePreset === preset.id}
              onClick={() => setRange(preset.resolve(today))}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.chip} ${activePreset === 'day' ? styles.chipActive : ''}`}
            aria-pressed={activePreset === 'day'}
            onClick={() => setRange({ startDate: range.endDate, endDate: range.endDate })}
          >
            One day
          </button>
        </div>

        <div className={styles.dates}>
          {isSingleDay ? (
            <label className={styles.dateField}>
              <span>Day</span>
              <input type="date" value={range.startDate} max={today} onChange={onDay} />
            </label>
          ) : (
            <>
              <label className={styles.dateField}>
                <span>From</span>
                <input type="date" value={range.startDate} max={today} onChange={onDate('startDate')} />
              </label>
              <label className={styles.dateField}>
                <span>To</span>
                <input type="date" value={range.endDate} max={today} onChange={onDate('endDate')} />
              </label>
            </>
          )}
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
            {!isSingleDay && summary.days > 0 ? (
              <div>
                <span className={styles.resultLabel}>Per day ({summary.days} days)</span>
                <strong className={styles.resultValue}>{peso(summary.dailyCost)}</strong>
              </div>
            ) : null}
          </div>

          <div className={styles.columns}>
            {facts.length > 0 ? (
              <section>
                <h3>What stands out</h3>
                <ul className={styles.list}>
                  {facts.map((fact) => (
                    <li key={fact.text} className={fact.tone === 'up' ? styles.up : styles.down}>{fact.text}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section>
              <h3>Tips to save</h3>
              <ul className={`${styles.list} ${styles.tips}`}>
                {tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </section>
          </div>

          {summary.days > 0 && summary.totalKwh > 0 ? (
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
            Costs are the electricity at your rates. Your bill also adds a small monthly meter charge.
          </p>
        </>
      )}
    </Card>
  );
};

export default RangeUsageCard;
