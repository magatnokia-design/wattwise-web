import { formatCurrency } from '../../screens/BudgetTracking/utils/budgetHelpers';
import { MonthPicker } from '../ui/MonthPicker';
import styles from './MonthRail.module.css';

/*
 * Which month Compare Months is about (Oct 2026): the phone's picker - one
 * month, ‹ › to step, a month grid to jump - in place of the dropdown and the
 * twelve-month year strip. April 2026 onwards only, as on the phone. The
 * month's measured total sits under it in one line.
 */
export const MonthRail = ({ monthOptions, monthTotals, month, onSelect }) => {
  const totals = monthTotals[month];
  const recorded = !!totals && totals.daysRecorded > 0;

  return (
    <div className={styles.rail}>
      <MonthPicker
        months={monthOptions.map((option) => option.value)}
        month={month}
        onSelect={onSelect}
      />
      <p className={styles.slotTotal}>
        {recorded ? (
          <>
            <span className="ww-num">{totals.kWh.toFixed(2)} kWh</span>
            {' · '}
            <span className="ww-num">{formatCurrency(totals.cost)}</span>
          </>
        ) : (
          'Nothing recorded'
        )}
      </p>
    </div>
  );
};

export default MonthRail;
