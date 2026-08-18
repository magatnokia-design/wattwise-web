import { useState } from 'react';
import { formatMonthShort } from '../../screens/ReferenceComparison/utils/comparisonHelpers';
import { formatCurrency } from '../../screens/BudgetTracking/utils/budgetHelpers';
import styles from './MonthRail.module.css';

/**
 * Month picker for the comparison screen.
 *
 * This used to be drag-and-drop: pick up a month chip, drop it on a slot. Two
 * things were wrong with that.
 *
 * HTML5 drag events do not fire on touch at all, so on a phone or tablet the
 * advertised interaction was dead - and the slots said "Drop a month here",
 * instructing people to do something their device could not do. Click was
 * already implemented as the shortcut, so the feature worked, but only for
 * anyone who ignored the label.
 *
 * And dragging is the wrong verb regardless. Dragging suits arranging things
 * whose order matters. This is choosing two values out of twelve, which is what
 * a select control is for, and a select carries its current value visibly
 * instead of asking the user to infer it from where a chip ended up.
 *
 * So: two selects, which every device and every assistive technology already
 * knows how to operate. The bar strip stays, because the original note above it
 * was right that a bare dropdown hides the data you are choosing between - but
 * it is now an overview you can click, not the only way in.
 */
export const MonthRail = ({
  monthOptions,
  monthTotals,
  monthA,
  monthB,
  onSelectA,
  onSelectB,
  loading,
}) => {
  // Which slot a strip click fills. Starts on A and flips after each pick, so
  // clicking two months in a row reads as "compare this with that".
  const [activeSlot, setActiveSlot] = useState('A');

  // Bars are relative to the tallest month on screen. Against a fixed ceiling a
  // real month of two-outlet usage would be a sliver.
  const peak = monthOptions.reduce(
    (highest, option) => Math.max(highest, Number(monthTotals[option.value]?.kWh) || 0),
    0
  );

  const assign = (slot, monthKey) => {
    if (slot === 'A') {
      onSelectA(monthKey);
      setActiveSlot('B');
    } else {
      onSelectB(monthKey);
      setActiveSlot('A');
    }
  };

  const renderSlot = (slot, label, monthKey, onSelect) => {
    const totals = monthTotals[monthKey];
    const recorded = !!totals && totals.daysRecorded > 0;

    return (
      <div
        className={`${styles.slot} ${activeSlot === slot ? styles.slotActive : ''}`}
        onFocus={() => setActiveSlot(slot)}
      >
        <label className={styles.slotLabel} htmlFor={`ww-month-${slot}`}>
          {label}
        </label>

        <select
          id={`ww-month-${slot}`}
          className={styles.slotSelect}
          value={monthKey || ''}
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
            </>
          ) : (
            'Nothing recorded'
          )}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.rail}>
      <div className={styles.slots}>
        {renderSlot('A', 'Month', monthA, onSelectA)}
        <span className={styles.versus} aria-hidden="true">
          vs
        </span>
        {renderSlot('B', 'Compared with', monthB, onSelectB)}
      </div>

      <p className={styles.stripHint}>
        Or pick from the year — a tap fills the{' '}
        <strong>{activeSlot === 'A' ? 'Month' : 'Compared with'}</strong> box.
      </p>

      <div className={styles.strip} role="group" aria-label="Months">
        {monthOptions.map((option) => {
          const totals = monthTotals[option.value];
          const kWh = Number(totals?.kWh) || 0;
          const recorded = !!totals && totals.daysRecorded > 0;
          const inUse =
            option.value === monthA ? 'A' : option.value === monthB ? 'B' : null;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => assign(activeSlot, option.value)}
              className={`${styles.chip} ${inUse ? styles.chipInUse : ''} ${
                recorded ? '' : styles.chipEmpty
              }`}
              aria-label={`${formatMonthShort(option.value)}${
                recorded ? `, ${kWh.toFixed(2)} kilowatt hours` : ', nothing recorded'
              }. Fills the ${activeSlot === 'A' ? 'Month' : 'Compared with'} box.`}
            >
              {inUse ? <span className={styles.chipTag}>{inUse}</span> : null}

              <span className={styles.barTrack} aria-hidden="true">
                <span
                  className={styles.bar}
                  style={{ height: peak > 0 ? `${Math.max((kWh / peak) * 100, 2)}%` : '2%' }}
                />
              </span>

              <span className={styles.chipMonth}>{formatMonthShort(option.value)}</span>
              <span className={styles.chipValue}>
                {loading ? '·' : recorded ? <span className="ww-num">{kWh.toFixed(1)}</span> : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthRail;
