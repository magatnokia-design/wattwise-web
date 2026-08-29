/**
 * Which day entry the Daily tab is entitled to show.
 *
 * A named function rather than an inline `liveTodayEntry || fallbackDaily`,
 * because that expression has been written and removed four times across this
 * project and reads as harmless every time. It is not: the fallback is the last
 * *rolled-up* day, so the `||` quietly puts another date's real figures under a
 * tab labelled Daily. Reported on a phone as 0.01 kWh and ₱0.09 of usage on a
 * morning the Hub had not been switched on — 28 August's numbers, shown on the
 * 29th, beside a "Daily" badge.
 *
 * The rule: today's entry or nothing. A day with no readings is zero, and the
 * screen says when the last reading actually was.
 *
 * @param {object|null} liveTodayEntry Today, assembled from the outlet documents.
 * @param {object|null} fallbackDaily The most recent rolled-up day, if any.
 * @returns {{entry: object|null, lastMeasuredDateKey: string}}
 *   `entry` is today or null. `lastMeasuredDateKey` is only set when there is
 *   no entry, and names the day the figures would otherwise have come from.
 */
export const resolveDailyEntry = (liveTodayEntry, fallbackDaily) => {
  if (liveTodayEntry) {
    return { entry: liveTodayEntry, lastMeasuredDateKey: '' };
  }

  const dateKey = typeof fallbackDaily?.date === 'string' ? fallbackDaily.date : '';
  return { entry: null, lastMeasuredDateKey: dateKey };
};

export default resolveDailyEntry;
