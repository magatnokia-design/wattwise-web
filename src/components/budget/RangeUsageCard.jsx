import { useMemo, useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { DagitabCalendar } from '../ui/DagitabCalendar';
import { Spinner } from '../ui/Feedback';
import { getManilaDateKey } from '../../utils/liveUsage';
import { RANGE_PRESETS, addDaysToKey, buildBudgetTips } from '../../utils/rangeUsage';
import styles from './RangeUsageCard.module.css';

/**
 * "Check your usage" on the website (Oct 2026). Same hook (useRangeUsage) and
 * the same rangeUsage.js as the phone - copy-rule, tested in both repos - so
 * both clients say the same thing about the same dates.
 *
 * Three ways to choose (This month, Pick dates, One day), and,
 * because the screen is wider than a phone's, more of what the figures can
 * already say: the day-by-day bars, how the energy split between the two
 * outlets, the busiest and quietest days, the top appliance, weekends against
 * weekdays, and up to three tips. Nothing here is general advice - every line
 * is computed from the dates chosen.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (key) => {
  const [, m, d] = String(key).split('-').map(Number);
  return m && d ? `${MONTHS[m - 1]} ${d}` : '--';
};
const peso = (value) => `₱${Number(value || 0).toFixed(2)}`;
const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const dayKwh = (row) => (row?.outlet1Energy !== undefined || row?.outlet2Energy !== undefined
  ? num(row.outlet1Energy) + num(row.outlet2Energy)
  : num(row?.totalEnergy));
const formatHour = (hour) => {
  const h = Number(hour);
  if (!Number.isFinite(h)) return null;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
};

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
  days = [],
  status,
  message,
  onRetry,
  // Each day's kWh and the loader for the month the calendar shows.
  calendarKwh = null,
  onCalendarMonth,
  monthlyBudget,
  daysInMonth,
}) => {
  const today = getManilaDateKey();
  // The Dagitab calendar: 'range' for "Pick dates", 'single' for "One day".
  const [calendarMode, setCalendarMode] = useState(null);

  const monthPreset = RANGE_PRESETS.find((preset) => preset.id === 'month');
  const thisMonth = monthPreset ? monthPreset.resolve(today) : null;
  const isSingleDay = range.startDate === range.endDate;
  const mode = thisMonth && range.startDate === thisMonth.startDate && range.endDate === thisMonth.endDate
    ? 'month'
    : isSingleDay ? 'day' : 'range';

  const hasBudget = monthlyBudget > 0;
  const paceOver = hasBudget && summary.monthPaceCost > monthlyBudget;
  const tips = status === 'ready' ? buildBudgetTips(summary, insights, { monthlyBudget, daysInMonth }) : [];
  const change = insights?.change || null;

  // One bar per calendar day in the range, a gap for a day with nothing used.
  const bars = useMemo(() => {
    if (status !== 'ready' || isSingleDay || summary.days <= 0) return [];
    const byDate = new Map((days || []).map((row) => [row.date, row]));
    const out = [];
    for (let key = summary.startDate; key <= summary.endDate; key = addDaysToKey(key, 1)) {
      out.push({ date: key, kwh: dayKwh(byDate.get(key)), cost: num(byDate.get(key)?.cost) });
      if (out.length > 400) break;
    }
    return out;
  }, [days, status, isSingleDay, summary.days, summary.startDate, summary.endDate]);
  const tallest = bars.reduce((max, bar) => Math.max(max, bar.kwh), 0);

  const outletTotal = num(summary.outlet1Kwh) + num(summary.outlet2Kwh);
  const outletShare = (kwh) => (outletTotal > 0 ? Math.round((kwh / outletTotal) * 100) : 0);

  const highlights = [];
  if (insights?.busiest) {
    highlights.push({ icon: 'trending-up-outline', label: 'Busiest day', value: `${shortDate(insights.busiest.date)} · ${peso(insights.busiest.cost)}` });
  }
  if (insights?.quietest && insights.quietest.date !== insights.busiest?.date) {
    highlights.push({ icon: 'time-outline', label: 'Quietest day', value: `${shortDate(insights.quietest.date)} · ${peso(insights.quietest.cost)}` });
  }
  if (insights?.topAppliance) {
    highlights.push({
      icon: 'power-outline',
      label: `Top appliance · ${insights.topAppliance.name}`,
      value: `${insights.topAppliance.share}% · ${peso(insights.topAppliance.cost)}`,
    });
  }
  if (insights?.weekends) {
    highlights.push({
      icon: 'calendar-outline',
      label: 'Weekends vs weekdays',
      value: `${peso(insights.weekends.weekendDaily)} vs ${peso(insights.weekends.weekdayDaily)} a day`,
    });
  }
  if (insights?.day?.peakPower > 0) {
    const hour = formatHour(insights.day.peakHour);
    highlights.push({ icon: 'flash-outline', label: 'Highest draw', value: `${insights.day.peakPower.toFixed(0)} W${hour ? ` · ${hour}` : ''}` });
  }

  const MODES = [
    { id: 'month', label: 'This month', onClick: () => thisMonth && setRange(thisMonth) },
    { id: 'range', label: 'Pick dates', onClick: () => setCalendarMode('range') },
    { id: 'day', label: 'One day', onClick: () => setCalendarMode('single') },
  ];

  return (
    <Card>
      <CardHeader title="Check your usage" />

      <div className={styles.controls}>
        <div className={styles.presets} role="group" aria-label="Choose dates">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.chip} ${mode === item.id ? styles.chipActive : ''}`}
              aria-pressed={mode === item.id}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>

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
          These dates could not be loaded.{' '}
          <button type="button" className={styles.retry} onClick={onRetry}>Try again</button>
        </p>
      ) : status === 'loading' ? (
        <Spinner label="Adding up your usage" />
      ) : (
        <>
          <div className={styles.tiles}>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>kWh used</span>
              <strong className={styles.tileValue}>{num(summary.totalKwh).toFixed(num(summary.totalKwh) < 1 ? 3 : 2)}</strong>
            </div>
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Cost</span>
              <strong className={`${styles.tileValue} ${styles.tileCost}`}>{peso(summary.cost)}</strong>
            </div>
            {!isSingleDay ? (
              <div className={styles.tile}>
                <span className={styles.tileLabel}>Per day</span>
                <strong className={styles.tileValue}>{peso(summary.dailyCost)}</strong>
                <span className={styles.tileSub}>{num(summary.dailyKwh).toFixed(num(summary.dailyKwh) < 1 ? 3 : 2)} kWh</span>
              </div>
            ) : null}
            <div className={styles.tile}>
              <span className={styles.tileLabel}>vs {summary.days === 1 ? 'day' : 'days'} before</span>
              {change && change.percent !== 0 ? (
                <strong className={`${styles.tileValue} ${change.percent > 0 ? styles.up : styles.down}`}>
                  <Icon name={change.percent > 0 ? 'caret-up' : 'caret-down'} />
                  {Math.abs(change.percent)}%
                </strong>
              ) : (
                <strong className={styles.tileValue}>{change ? 'Same' : '—'}</strong>
              )}
            </div>
          </div>

          {bars.length > 1 ? (
            <div className={styles.chart} role="img" aria-label="kWh used each day">
              {bars.map((bar) => (
                <div key={bar.date} className={styles.barSlot} title={`${shortDate(bar.date)} · ${bar.kwh.toFixed(2)} kWh · ${peso(bar.cost)}`}>
                  <span
                    className={styles.barFill}
                    style={{ height: tallest > 0 ? `${Math.max((bar.kwh / tallest) * 100, bar.kwh > 0 ? 3 : 0)}%` : '0%' }}
                  />
                </div>
              ))}
            </div>
          ) : null}
          {bars.length > 1 ? (
            <div className={styles.chartAxis}>
              <span>{shortDate(bars[0].date)}</span>
              <span>kWh each day</span>
              <span>{shortDate(bars[bars.length - 1].date)}</span>
            </div>
          ) : null}

          <div className={styles.panels}>
            {outletTotal > 0 ? (
              <section className={styles.panel}>
                <h3>By outlet</h3>
                {[
                  ['Outlet 1', num(summary.outlet1Kwh)],
                  ['Outlet 2', num(summary.outlet2Kwh)],
                ].map(([label, kwh]) => (
                  <div key={label} className={styles.split}>
                    <div className={styles.splitHead}>
                      <span>{label}</span>
                      <span className="ww-num">{kwh.toFixed(2)} kWh · {outletShare(kwh)}%</span>
                    </div>
                    <div className={styles.splitTrack}>
                      <span className={styles.splitFill} style={{ width: `${outletShare(kwh)}%` }} />
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            {highlights.length > 0 ? (
              <section className={styles.panel}>
                <h3>Highlights</h3>
                <ul className={styles.highlights}>
                  {highlights.map((item) => (
                    <li key={item.label}>
                      <Icon name={item.icon} />
                      <span className={styles.hlLabel}>{item.label}</span>
                      <span className={`${styles.hlValue} ww-num`}>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {summary.days > 0 && summary.totalKwh > 0 ? (
            <p className={`${styles.pace} ${paceOver ? styles.paceOver : ''}`}>
              Full month at this pace: <strong className="ww-num">{peso(summary.monthPaceCost)}</strong>
              {hasBudget ? (paceOver ? ' · over budget' : ' · within budget') : ''}
            </p>
          ) : null}

          {tips.length > 0 ? (
            <ul className={styles.tipList}>
              {tips.slice(0, 3).map((tip) => (
                <li key={tip} className={styles.tip}>
                  <Icon name="bulb-outline" />
                  {tip}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Card>
  );
};

export default RangeUsageCard;
