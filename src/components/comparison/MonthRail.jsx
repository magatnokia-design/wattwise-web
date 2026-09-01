import { formatMonthShort } from '../../screens/ReferenceComparison/utils/comparisonHelpers';
import { formatCurrency } from '../../screens/BudgetTracking/utils/budgetHelpers';
import styles from './MonthRail.module.css';

/**
 * Month picker for the comparison screen. One month, one control.
 *
 * This has now lost two things, for the same underlying reason each time.
 *
 * It was drag-and-drop first: pick up a month chip, drop it on a slot. HTML5
 * drag events do not fire on touch, so on a phone the advertised interaction
 * was dead while the slots read "Drop a month here" - instructing people to do
 * something their device could not do. Click was already wired as a shortcut,
 * so the feature worked, but only for anyone who ignored the label.
 *
 * Then it was two selects, A and B. That fixed the input but not the concept.
 * The bill card below only ever followed slot A, so slot B governed half the
 * screen and nothing said which half; picking July in it while August sat in A
 * produced a page that looked like it was comparing three things at once. The
 * baseline is now always the preceding month, derived rather than chosen, and
 * named where the comparison is actually shown.
 *
 * What survives is the strip, because the point it was always making is right:
 * a bare dropdown hides the data you are choosing between. It is an overview
 * you can click, not the only way in.
 */
/*
 * Which rate set produced the peso figure. WattWise measured the kWh either
 * way - only the pricing differs - so the distinction is worth four words
 * rather than a badge.
 */
const RAIL_BASIS = {
  final: ' · final statement',
  statement: ' · same as your statement',
  estimate: ' measured by WattWise',
};

export const MonthRail = ({ monthOptions, monthTotals, month, onSelect, loading }) => {
  // Bars are relative to the tallest month on screen. Against a fixed ceiling a
  // real month of two-outlet usage would be a sliver.
  const peak = monthOptions.reduce(
    (highest, option) => Math.max(highest, Number(monthTotals[option.value]?.kWh) || 0),
    0
  );

  const totals = monthTotals[month];
  const recorded = !!totals && totals.daysRecorded > 0;

  return (
    <div className={styles.rail}>
      <div className={styles.slot}>
        <label className={styles.slotLabel} htmlFor="ww-month">
          Month
        </label>

        <select
          id="ww-month"
          className={styles.slotSelect}
          value={month || ''}
          onChange={(event) => onSelect(event.target.value)}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {formatMonthShort(option.value)}
              {monthTotals[option.value]?.daysRecorded > 0 ? '' : ' — nothing recorded'}
            </option>
          ))}
        </select>

        <span className={styles.slotTotal}>
          {recorded ? (
            <>
              <span className="ww-num">{totals.kWh.toFixed(2)} kWh</span>
              {' · '}
              <span className="ww-num">{formatCurrency(totals.cost)}</span>
              {/* Which rate set that peso figure came from. WattWise measured
                  the kWh either way; only the pricing differs, and a finalized
                  month is priced with PELCO III's official rates rather than
                  the ones in Settings. */}
              {RAIL_BASIS[totals.costBasis] || RAIL_BASIS.estimate}
            </>
          ) : (
            'Nothing recorded — you can still enter this month’s bill below'
          )}
        </span>
      </div>

      <p className={styles.stripHint}>Or pick from the year.</p>

      <div className={styles.strip} role="group" aria-label="Months">
        {monthOptions.map((option) => {
          const optionTotals = monthTotals[option.value];
          const kWh = Number(optionTotals?.kWh) || 0;
          const hasData = !!optionTotals && optionTotals.daysRecorded > 0;
          const selected = option.value === month;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-pressed={selected}
              className={`${styles.chip} ${selected ? styles.chipInUse : ''} ${
                hasData ? '' : styles.chipEmpty
              }`}
              aria-label={`${formatMonthShort(option.value)}${
                hasData ? `, ${kWh.toFixed(2)} kilowatt hours` : ', nothing recorded'
              }`}
            >
              <span className={styles.barTrack} aria-hidden="true">
                <span
                  className={styles.bar}
                  style={{ height: peak > 0 ? `${Math.max((kWh / peak) * 100, 2)}%` : '2%' }}
                />
              </span>

              <span className={styles.chipMonth}>{formatMonthShort(option.value)}</span>
              <span className={styles.chipValue}>
                {loading ? '·' : hasData ? <span className="ww-num">{kWh.toFixed(1)}</span> : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthRail;
