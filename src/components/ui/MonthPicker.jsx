import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Icon } from './Icon';
import { CALENDAR_FIRST_DAY } from '../../utils/calendarGrid';
import styles from './MonthPicker.module.css';

// Nothing before April 2026 is offered anywhere (calendarGrid.js, shared with
// the phone, whose Compare Usage starts there too).
export const FIRST_MONTH = CALENDAR_FIRST_DAY.slice(0, 7);

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

export const formatMonthLong = (key) => {
  const [y, m] = String(key || '').split('-').map(Number);
  return y && m ? `${LONG[m - 1]} ${y}` : '';
};

/**
 * One month, stepped with ‹ › or chosen from a month grid - the phone's
 * MonthComparePicker on the web (Oct 2026). Replaces the year strip.
 *
 * @param {string[]} months  Selectable 'YYYY-MM' keys, any order; anything
 *   before FIRST_MONTH is dropped.
 */
export const MonthPicker = ({ months, month, onSelect, title = 'Select month' }) => {
  const [open, setOpen] = useState(false);
  const available = useMemo(
    () => [...new Set(months)].filter((value) => value >= FIRST_MONTH).sort(),
    [months]
  );
  const index = available.indexOf(month);
  const older = index > 0 ? available[index - 1] : null;
  const newer = index >= 0 && index < available.length - 1 ? available[index + 1] : null;

  const years = useMemo(() => [...new Set(available.map((value) => Number(value.slice(0, 4))))], [available]);
  const [year, setYear] = useState(() => Number(String(month).slice(0, 4)));
  useEffect(() => {
    if (open) setYear(Number(String(month).slice(0, 4)));
  }, [open, month]);
  const yearIndex = years.indexOf(year);

  const pick = (value) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.step}
        onClick={() => older && onSelect(older)}
        disabled={!older}
        aria-label="Previous month"
      >
        <Icon name="chevron-back" />
      </button>
      <button
        type="button"
        className={styles.current}
        onClick={() => setOpen(true)}
        aria-label={`Month: ${formatMonthLong(month)}. Change`}
      >
        <Icon name="calendar-outline" />
        <span>{formatMonthLong(month)}</span>
        <Icon name="caret-down" />
      </button>
      <button
        type="button"
        className={styles.step}
        onClick={() => newer && onSelect(newer)}
        disabled={!newer}
        aria-label="Next month"
      >
        <Icon name="chevron-forward" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        width={360}
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>}
      >
        <div className={styles.yearRow}>
          <button
            type="button"
            className={styles.step}
            onClick={() => yearIndex > 0 && setYear(years[yearIndex - 1])}
            disabled={yearIndex <= 0}
            aria-label="Previous year"
          >
            <Icon name="chevron-back" />
          </button>
          <span className={styles.year}>{year}</span>
          <button
            type="button"
            className={styles.step}
            onClick={() => yearIndex < years.length - 1 && setYear(years[yearIndex + 1])}
            disabled={yearIndex >= years.length - 1}
            aria-label="Next year"
          >
            <Icon name="chevron-forward" />
          </button>
        </div>
        <div className={styles.grid}>
          {SHORT.map((name, monthIndex) => {
            const value = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            const enabled = available.includes(value);
            const selected = value === month;
            const latest = value === available[available.length - 1];
            return (
              <button
                key={value}
                type="button"
                className={`${styles.cell} ${selected ? styles.cellSelected : ''}`}
                onClick={() => enabled && pick(value)}
                disabled={!enabled}
                aria-pressed={selected}
              >
                {name}
                {latest && !selected ? <span className={styles.nowDot} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default MonthPicker;
