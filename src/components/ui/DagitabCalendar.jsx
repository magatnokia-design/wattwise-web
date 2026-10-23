import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Icon } from './Icon';
import {
  MONTH_NAMES,
  WEEKDAY_INITIALS,
  buildMonthGrid,
  shiftMonth,
  parseKey,
  applyRangeTap,
  isBetween,
  formatKeyShort,
  formatDayKwh,
  laterKey,
  CALENDAR_FIRST_DAY,
} from '../../utils/calendarGrid';
import styles from './DagitabCalendar.module.css';

/**
 * The Dagitab calendar, as on the phone (Oct 2026): a month grid in the app's
 * greens, Monday first, each day's kWh under its number, nothing before
 * CALENDAR_FIRST_DAY (April 2026) and nothing after `maxDate`. `mode="range"`
 * takes two clicks (start, then end); `mode="single"` takes one.
 *
 * The date maths is calendarGrid.js, byte-identical with the phone and tested
 * in test/calendarGrid.test.js - so the two clients agree on every grid, every
 * floor and every figure.
 *
 * @param {'single'|'range'} mode
 * @param {Object<string, number>} [dayValues] kWh by date key.
 * @param {({year, monthIndex}) => void} [onMonthChange] Load figures for the
 *   month on screen.
 */
export const DagitabCalendar = ({
  open,
  mode = 'range',
  title,
  startDate,
  endDate,
  minDate,
  maxDate,
  dayValues = null,
  onMonthChange,
  onConfirm,
  onClose,
}) => {
  const floor = laterKey(minDate, CALENDAR_FIRST_DAY);
  const [selection, setSelection] = useState({ startDate, endDate });
  const [view, setView] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelection({ startDate, endDate: mode === 'range' ? endDate : startDate });
    const key = mode === 'range' ? endDate || startDate : startDate;
    const anchor = parseKey(key && key < floor ? floor : key) || parseKey(maxDate);
    if (anchor) setView({ year: anchor.year, monthIndex: anchor.monthIndex });
  }, [open, startDate, endDate, mode, maxDate, floor]);

  useEffect(() => {
    if (open && view && onMonthChange) onMonthChange({ year: view.year, monthIndex: view.monthIndex });
  }, [open, view, onMonthChange]);

  if (!open || !view) return null;

  const grid = buildMonthGrid(view.year, view.monthIndex);
  const pad = (n) => String(n).padStart(2, '0');
  const monthStart = `${view.year}-${pad(view.monthIndex + 1)}-01`;
  const next = shiftMonth(view, 1);
  const nextStart = `${next.year}-${pad(next.monthIndex + 1)}-01`;
  const canGoBack = monthStart > floor;
  const canGoForward = !maxDate || nextStart <= maxDate;
  const disabled = (key) => key < floor || (maxDate && key > maxDate);

  const handleClick = (key) => {
    if (mode === 'single') setSelection({ startDate: key, endDate: key });
    else setSelection((current) => applyRangeTap(current, key));
  };

  const complete = Boolean(selection.startDate && selection.endDate);
  const summary = !selection.startDate
    ? 'Pick a date'
    : mode === 'single' || selection.startDate === selection.endDate
      ? formatKeyShort(selection.startDate)
      : selection.endDate
        ? `${formatKeyShort(selection.startDate, false)} – ${formatKeyShort(selection.endDate)}`
        : `${formatKeyShort(selection.startDate, false)} – pick the end`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || (mode === 'range' ? 'Choose dates' : 'Choose a day')}
      width={400}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => complete && onConfirm(selection)} disabled={!complete}>Done</Button>
        </>
      )}
    >
      <p className={styles.summary}>{summary}</p>

      <div className={styles.monthRow}>
        <button
          type="button"
          className={styles.nav}
          onClick={() => canGoBack && setView(shiftMonth(view, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <Icon name="chevron-back" />
        </button>
        <span className={styles.monthLabel}>{MONTH_NAMES[view.monthIndex]} {view.year}</span>
        <button
          type="button"
          className={styles.nav}
          onClick={() => canGoForward && setView(next)}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          <Icon name="chevron-forward" />
        </button>
      </div>

      <div className={styles.grid} role="grid">
        {WEEKDAY_INITIALS.map((day) => (
          <span key={day} className={styles.weekday}>{day}</span>
        ))}
        {grid.map((key, index) => {
          if (!key) return <span key={`blank-${index}`} className={styles.cell} />;
          const isStart = key === selection.startDate;
          const isEnd = key === selection.endDate;
          const isEdge = isStart || isEnd;
          const inside = mode === 'range' && isBetween(key, selection.startDate, selection.endDate);
          const off = disabled(key);
          const kwhText = dayValues && !off ? formatDayKwh(dayValues[key]) : null;
          return (
            <button
              key={key}
              type="button"
              className={[
                styles.cell,
                styles.day,
                inside ? styles.inside : '',
                isEdge ? styles.edge : '',
                key === maxDate && !isEdge ? styles.today : '',
              ].join(' ')}
              onClick={() => handleClick(key)}
              disabled={off}
              aria-pressed={isEdge}
              aria-label={kwhText ? `${formatKeyShort(key)}, ${kwhText} kWh` : formatKeyShort(key)}
            >
              <span className={styles.dayNumber}>{Number(key.slice(8))}</span>
              {dayValues ? <span className={styles.kwh}>{kwhText || ' '}</span> : null}
            </button>
          );
        })}
      </div>

      {dayValues ? <p className={styles.legend}>kWh used each day</p> : null}
    </Modal>
  );
};

export default DagitabCalendar;
