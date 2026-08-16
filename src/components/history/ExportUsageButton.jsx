import { useState } from 'react';
import { describeUsageRows } from '../../screens/History/utils/historyHelpers';
import { Button } from '../ui/Button';
import styles from './ExportUsageButton.module.css';

/**
 * Downloads the loaded daily usage as a styled Excel workbook.
 *
 * A workbook rather than CSV because CSV is plain text and cannot carry the
 * theme, the column widths, or a currency format - and the costs here need to
 * *look* like pesos while staying numeric enough to add up, which is the one
 * thing CSV could not do.
 *
 * Built entirely in the browser from rows already on screen - no callable, no
 * second read, nothing leaves Firestore that was not already here. The object
 * URL is revoked immediately after the click so the blob does not sit in memory
 * for the life of the page.
 *
 * Exports exactly what the table is showing, which is why the caption says how
 * many days that is. A button that quietly exported a different range than the
 * table beneath it would be worse than no button.
 */
export const ExportUsageButton = ({ usage = [] }) => {
  const [busy, setBusy] = useState(false);

  const rows = Array.isArray(usage) ? usage.filter((row) => row?.date) : [];
  const hasRows = rows.length > 0;

  const handleExport = async () => {
    if (!hasRows || busy) return;

    setBusy(true);

    try {
      // Imported here, not at the top: the spreadsheet writer is ~400 kB and
      // Vite splits it into its own chunk, so a visitor who never exports never
      // downloads it. The button shows a spinner while it arrives.
      const { writeUsageXlsx, buildUsageFilename, XLSX_MIME } =
        await import('../../utils/usageExport');

      // 'array' gives an ArrayBuffer, which is what Blob wants; the phone takes
      // the same workbook as base64 instead. xlsx is a zip, so neither can be
      // treated as text.
      const blob = new Blob([writeUsageXlsx(rows, 'array')], { type: XLSX_MIME });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = buildUsageFilename(rows);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Button size="sm" onClick={handleExport} disabled={!hasRows || busy}>
        <span className={styles.icon} aria-hidden="true">📄</span>
        Export Excel
      </Button>
      <span className={styles.caption}>{describeUsageRows(rows)}</span>
    </div>
  );
};

export default ExportUsageButton;
