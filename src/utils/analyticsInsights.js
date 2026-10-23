/**
 * Analytics, read as findings (Oct 2026).
 *
 * Pure and tested (test/analyticsInsights.test.js). Every line it returns is
 * computed from the period's own figures - nothing is general advice dressed
 * as a finding - and a line is left out rather than padded when the data
 * cannot support it (too few days, nothing used, no previous period).
 */
import { addDaysToKey } from './rangeUsage';

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const lastDayOfMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * The period the current tab is compared with, as Manila date keys.
 *
 * Daily   -> yesterday.
 * Weekly  -> the 7 days before the 7 on screen.
 * Monthly -> the same days of last month (1st to today's day-of-month, clamped
 *            to last month's length), so a month part-way through is compared
 *            with the same stretch of the one before, not with all of it.
 *
 * @param {'Daily'|'Weekly'|'Monthly'} tab
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{ startDate: string, endDate: string, label: string }}
 */
export const previousWindow = (tab, today) => {
  if (tab === 'Daily') {
    const day = addDaysToKey(today, -1);
    return { startDate: day, endDate: day, label: 'yesterday' };
  }
  if (tab === 'Weekly') {
    return { startDate: addDaysToKey(today, -13), endDate: addDaysToKey(today, -7), label: 'the 7 days before' };
  }
  const [y, m, d] = today.split('-').map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;
  const endDay = Math.min(d, lastDayOfMonth(prevYear, prevMonth));
  const pad = (n) => String(n).padStart(2, '0');
  return {
    startDate: `${prevYear}-${pad(prevMonth)}-01`,
    endDate: `${prevYear}-${pad(prevMonth)}-${pad(endDay)}`,
    label: 'the same days last month',
  };
};

/** kWh in a set of daily rows (either outlet split or totalEnergy). */
export const sumKwh = (rows) => (Array.isArray(rows) ? rows : []).reduce((total, row) => {
  const split = row?.outlet1Energy !== undefined || row?.outlet2Energy !== undefined;
  return total + Math.max(0, split ? num(row.outlet1Energy) + num(row.outlet2Energy) : num(row?.totalEnergy));
}, 0);

/**
 * The change against the previous period, or null when there is nothing
 * honest to say (no previous usage).
 */
export const periodChange = (currentKwh, previousKwh) => {
  const before = num(previousKwh);
  if (!(before > 0)) return null;
  return {
    previousKwh: before,
    percent: Math.round(((num(currentKwh) - before) / before) * 100),
  };
};

/**
 * Plain-language findings for the period on screen.
 *
 * @param {object} args
 * @param {'Daily'|'Weekly'|'Monthly'} args.tab
 * @param {object} args.summary  useAnalytics().summary
 * @param {Array}  args.series   useAnalytics().series (one point per day)
 * @param {{percent:number}|null} args.change  periodChange(...)
 * @param {string} args.previousLabel  previousWindow(...).label
 * @returns {{ icon: string, text: string, tone?: 'up'|'down' }[]}
 */
export const buildAnalyticsInsights = ({ tab, summary = {}, series = [], change = null, previousLabel = '' }) => {
  const out = [];
  const total = num(summary.totalEnergy);
  if (!(total > 0)) return out;

  if (change && change.percent !== 0) {
    out.push({
      icon: change.percent > 0 ? 'caret-up' : 'caret-down',
      tone: change.percent > 0 ? 'up' : 'down',
      text: `${Math.abs(change.percent)}% ${change.percent > 0 ? 'more' : 'less'} energy than ${previousLabel}.`,
    });
  } else if (change) {
    out.push({ icon: 'trending-up-outline', text: `About the same as ${previousLabel}.` });
  }

  // Which outlet carried the period - only worth saying when one clearly did.
  const o1 = num(summary.outlet1Total);
  const o2 = num(summary.outlet2Total);
  if (o1 + o2 > 0) {
    const leader = o1 >= o2 ? 1 : 2;
    const share = Math.round((Math.max(o1, o2) / (o1 + o2)) * 100);
    if (share >= 60) out.push({ icon: 'power-outline', text: `Outlet ${leader} used ${share}% of the energy.` });
    else out.push({ icon: 'power-outline', text: 'The two outlets shared the load about evenly.' });
  }

  // The top appliance by name, the per-day attribution the statement uses.
  const appliances = Array.isArray(summary.applianceUsage) ? summary.applianceUsage : [];
  const top = [...appliances].sort((a, b) => num(b.energyKwh) - num(a.energyKwh))[0];
  if (top && num(top.energyKwh) > 0) {
    out.push({
      icon: 'pricetags-outline',
      text: `${top.applianceName} was the biggest user - ${Math.round((num(top.energyKwh) / total) * 100)}% of the energy.`,
    });
  }

  if (tab !== 'Daily') {
    const used = series.filter((point) => num(point.total) > 0);
    if (used.length >= 3) {
      const busiest = [...used].sort((a, b) => num(b.total) - num(a.total))[0];
      const average = total / series.length;
      if (busiest && average > 0 && num(busiest.total) >= average * 1.5) {
        out.push({
          icon: 'calendar-outline',
          text: `${busiest.fullLabel || busiest.label} was the busiest day - ${(num(busiest.total) / average).toFixed(1)}x the average.`,
        });
      }
      const idle = series.length - used.length;
      if (idle > 0) out.push({ icon: 'time-outline', text: `${idle} of ${series.length} days used nothing.` });
    }
  }

  if (num(summary.peakPowerW) > 0) {
    out.push({ icon: 'flash-outline', text: `Highest draw: ${num(summary.peakPowerW).toFixed(0)} W.` });
  }

  return out;
};
