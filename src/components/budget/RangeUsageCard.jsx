import { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { DagitabCalendar } from '../ui/DagitabCalendar';
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
const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;

// The range on the date button: "Oct 8, 2026", "Oct 1 – 22", "Sep 28 – Oct 5".
const formatRange = ({ startDate, endDate }) => {
  const [y] = String(startDate).split('-').map(Number);
  if (startDate === endDate) return `${shortDate(startDate)}, ${y}`;
  if (String(startDate).slice(0, 7) === String(endDate).slice(0, 7)) {
    return `${shortDate(startDate)} – ${Number(String(endDate).slice(8))}`;
  }
  return `${shortDate(startDate)} – ${shortDate(endDate)}`;
};

export const RangeUsageCard = ({
  range,
  setRange,
  summary,
  insights,
  status,
  message,
  onRetry,
  // Each day's kWh and the loader for the month the calendar shows - from
  // useRangeUsage, byte-identical with the phone.
  calendarKwh = null,
  onCalendarMonth,
  monthlyBudget,
  daysInMonth,
}) => {
  const today = getManilaDateKey();
  // The Dagitab calendar (Oct 2026), as on the phone: 'range' or 'single'.
  const [calendarMode, setCalendarMode] = useState(null);
  const isSingleDay = range.startDate === range.endDate;
  const activePreset = isSingleDay
    ? 'day'
    : RANGE_PRESETS.find((preset) => {
      const resolved = preset.resolve(today);
      return resolved.startDate === range.startDate && resolved.endDate === range.endDate;
    })?.id;

  const hasBudget = monthlyBudget > 0;
  const paceOver = hasBudget && summary.monthPaceCost > monthlyBudget;
  // One tip, the most specific the figures support (as on the phone).
  const tip = status === 'ready'
    ? buildBudgetTips(summary, insights, { monthlyBudget, daysInMonth })[0]
    : null;
  const change = insights?.change || null;


  return (
    <Card>
      <CardHeader title="Check your usage" />

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
            onClick={() => setCalendarMode('single')}
          >
            One day
          </button>
        </div>

        <button
          type="button"
          className={styles.datePill}
          onClick={() => setCalendarMode(isSingleDay ? 'single' : 'range')}
          aria-label={`Dates: ${formatRange(range)}. Change`}
        >
          <Icon name="calendar-outline" />
          {formatRange(range)}
        </button>

      </div>

      <DagitabCalendar
        open={calendarMode !== null}
        mode={calendarMode || 'range'}
        title={calendarMode === 'single' ? 'Check one day' : 'Check your usage'}
        startDate={calendarMode === 'single' ? range.endDate : range.startDate}
        endDate={range.endDate}
        maxDate={today}
        dayValues={calendarKwh || {}}
        onMonthChange={onCalendarMonth}
        onClose={() => setCalendarMode(null)}
        onConfirm={(picked) => {
          setRange({ startDate: picked.startDate, endDate: picked.endDate });
          setCalendarMode(null);
        }}
      />

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
              <span className={styles.resultLabel}>kWh used</span>
              <strong className={styles.resultValue}>{Number(summary.totalKwh || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span className={styles.resultLabel}>Cost</span>
              <strong className={`${styles.resultValue} ${styles.resultCost}`}>{peso(summary.cost)}</strong>
            </div>
          </div>

          {change && change.percent !== 0 ? (
            <p className={change.percent > 0 ? styles.changeUp : styles.changeDown}>
              <Icon name={change.percent > 0 ? 'caret-up' : 'caret-down'} />
              {Math.abs(change.percent)}% {change.percent > 0 ? 'more' : 'less'} than the{' '}
              {summary.days === 1 ? 'day' : 'days'} before
            </p>
          ) : null}

          {summary.days > 0 && summary.totalKwh > 0 ? (
            <p className={`${styles.pace} ${paceOver ? styles.paceOver : ''}`}>
              Full month at this pace: <strong className="ww-num">{peso(summary.monthPaceCost)}</strong>
              {hasBudget ? (paceOver ? ' · over budget' : ' · within budget') : ''}
            </p>
          ) : null}

          {tip ? (
            <p className={styles.tip}>
              <Icon name="bulb-outline" />
              {tip}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
};

export default RangeUsageCard;
