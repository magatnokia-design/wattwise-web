import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { DagitabCalendar } from '../ui/DagitabCalendar';
import { buildDayKwhMap } from '../../utils/calendarGrid';
import { getManilaDateKey } from '../../utils/liveUsage';
import styles from './ExportUsageButton.module.css';

/**
 * Export to Excel, as on the phone (Oct 2026): the user picks the dates on the
 * Dagitab calendar - each day's kWh shown, nothing before April 2026 - and the
 * workbook stays detailed (each outlet's appliance, energy and cost per day)
 * even though the table on screen shows only the date, energy and cost.
 *
 * Built in the browser from the rows already loaded (useHistory reads up to a
 * year), so nothing leaves Firestore that was not already here. The object URL
 * is revoked right after the click.
 */
export const ExportUsageButton = ({ usage = [] }) => {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const rows = useMemo(
    () => (Array.isArray(usage) ? usage.filter((row) => row?.date) : []),
    [usage]
  );
  const dayKwh = useMemo(() => buildDayKwhMap(rows), [rows]);
  const today = getManilaDateKey();

  const exportRange = async ({ startDate, endDate }) => {
    setPicking(false);
    const chosen = rows.filter((row) => row.date >= startDate && row.date <= endDate);
    if (chosen.length === 0) {
      setNote('Nothing was recorded between those dates.');
      return;
    }

    setBusy(true);
    setNote('');
    try {
      // Imported here: the spreadsheet writer is ~400 kB in its own chunk, so a
      // visitor who never exports never downloads it.
      const { writeUsageXlsx, buildUsageFilename, XLSX_MIME } =
        await import('../../utils/usageExport');

      // 'array' gives an ArrayBuffer for the Blob; xlsx is a zip, not text.
      const blob = new Blob([writeUsageXlsx(chosen, 'array')], { type: XLSX_MIME });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildUsageFilename(chosen);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNote(`${chosen.length === 1 ? '1 day' : `${chosen.length} days`} exported.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Button
        size="sm"
        onClick={() => { setNote(''); setPicking(true); }}
        disabled={!rows.length}
        loading={busy}
      >
        <span className={styles.icon} aria-hidden="true"><Icon name="document-text-outline" /></span>
        Export to Excel
      </Button>
      {note ? <span className={styles.caption}>{note}</span> : null}

      <DagitabCalendar
        open={picking}
        mode="range"
        title="Dates to export"
        startDate={`${today.slice(0, 7)}-01`}
        endDate={today}
        maxDate={today}
        dayValues={dayKwh}
        onClose={() => setPicking(false)}
        onConfirm={exportRange}
      />
    </div>
  );
};

export default ExportUsageButton;
