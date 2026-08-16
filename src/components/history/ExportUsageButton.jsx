import { useState } from 'react';
import {
  buildUsageCsv,
  buildUsageCsvFilename,
  describeUsageCsv,
} from '../../utils/usageCsv';
import { Button } from '../ui/Button';
import styles from './ExportUsageButton.module.css';

/**
 * Downloads the loaded daily usage as CSV.
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

  const handleExport = () => {
    if (!hasRows || busy) return;

    setBusy(true);

    try {
      const blob = new Blob([buildUsageCsv(rows)], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = buildUsageCsvFilename(rows);
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
        Export CSV
      </Button>
      <span className={styles.caption}>{describeUsageCsv(rows)}</span>
    </div>
  );
};

export default ExportUsageButton;
