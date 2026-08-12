import { useState } from 'react';
import { formatMonthShort } from '../../screens/ReferenceComparison/utils/comparisonHelpers';
import { formatCurrency } from '../../screens/BudgetTracking/utils/budgetHelpers';
import styles from './MonthRail.module.css';

const DRAG_TYPE = 'application/x-wattwise-month';

/**
 * Month picker for the comparison screen.
 *
 * Replaces two dropdowns. A dropdown hides the data it is choosing between —
 * you had to already know which month was expensive before you could pick it —
 * and on a desktop there is room to simply show the year.
 *
 * Drag a month onto a slot, or click it. Click is not a fallback bolted on for
 * accessibility: it is faster, and the chips are real buttons so the keyboard
 * gets the same behaviour. Drag is the affordance, click is the shortcut.
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
  // Which slot a click fills. Starts on A and flips after each pick, so
  // clicking two months in a row reads as "compare this with that".
  const [activeSlot, setActiveSlot] = useState('A');
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);

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

  const dropOn = (slot) => (event) => {
    event.preventDefault();
    // getData is only readable on drop; `dragging` covers the dragover styling
    // in between.
    const monthKey = event.dataTransfer.getData(DRAG_TYPE) || dragging;
    if (monthKey) assign(slot, monthKey);
    setDragOver(null);
    setDragging(null);
  };

  const renderSlot = (slot, label, monthKey) => {
    const totals = monthTotals[monthKey];
    const isActive = activeSlot === slot;

    return (
      <button
        type="button"
        className={`${styles.slot} ${isActive ? styles.slotActive : ''} ${
          dragOver === slot ? styles.slotOver : ''
        }`}
        onClick={() => setActiveSlot(slot)}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOver(slot);
        }}
        onDragLeave={() => setDragOver((current) => (current === slot ? null : current))}
        onDrop={dropOn(slot)}
        aria-label={`${label}: ${formatMonthShort(monthKey)}. Click to make this the slot a month fills.`}
      >
        <span className={styles.slotLabel}>{label}</span>
        <span className={styles.slotMonth}>{formatMonthShort(monthKey)}</span>
        <span className={styles.slotTotal}>
          {totals && totals.daysRecorded > 0 ? (
            <>
              <span className="ww-num">{totals.kWh.toFixed(2)} kWh</span>
              {' · '}
              <span className="ww-num">{formatCurrency(totals.cost)}</span>
            </>
          ) : (
            'Nothing recorded'
          )}
        </span>
        <span className={styles.slotHint}>
          {isActive ? 'Drop here, or click a month below' : 'Drop a month here'}
        </span>
      </button>
    );
  };

  return (
    <div className={styles.rail}>
      <div className={styles.slots}>
        {renderSlot('A', 'Month', monthA)}
        <span className={styles.versus} aria-hidden="true">
          vs
        </span>
        {renderSlot('B', 'Compared with', monthB)}
      </div>

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
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_TYPE, option.value);
                event.dataTransfer.effectAllowed = 'move';
                setDragging(option.value);
              }}
              onDragEnd={() => {
                setDragging(null);
                setDragOver(null);
              }}
              onClick={() => assign(activeSlot, option.value)}
              className={`${styles.chip} ${inUse ? styles.chipInUse : ''} ${
                dragging === option.value ? styles.chipDragging : ''
              } ${recorded ? '' : styles.chipEmpty}`}
              aria-label={`${formatMonthShort(option.value)}${
                recorded ? `, ${kWh.toFixed(2)} kilowatt hours` : ', nothing recorded'
              }. Fills the ${activeSlot === 'A' ? 'Month' : 'Compared with'} slot.`}
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
