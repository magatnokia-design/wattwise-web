import { useCallback, useEffect, useState } from 'react';
import { invoiceService } from '../../services/firebase';
import { isConnectivityError } from '../../utils/connectivity';
import { Section, Row, RowButton } from '../ui/ListSection';
import { Badge, Spinner } from '../ui/Feedback';
import styles from './StatementsSection.module.css';

/*
 * Monthly statements in Settings (Nov 2026) - the phone's StatementsModal list,
 * one row a month with its kWh, amount and status, and a button to email it
 * again. Months finalize themselves (applyPelcoRates), so there is nothing to
 * do here but read them; finalizing by hand with a different rate stays on the
 * phone.
 */

const STATUS = {
  DRAFT: { label: 'This month', tone: 'warn' },
  PENDING: { label: 'Estimate', tone: 'warn' },
  FINALIZED: { label: 'Final', tone: 'good' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
// '2026-10' -> 'October 2026'
const formatMonthName = (billingMonth) => {
  const [year, month] = String(billingMonth).split('-').map(Number);
  return year && month ? `${MONTHS[month - 1]} ${year}` : String(billingMonth);
};

export const StatementsSection = ({ userId }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // Which month is being emailed, and the outcome of the last send.
  const [sending, setSending] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const response = await invoiceService.getInvoices(userId);
    setInvoices(response.success ? response.data : []);
    setLoadFailed(!response.success);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEmail = async (billingMonth) => {
    setSending(billingMonth);
    setNote(null);
    const response = await invoiceService.resendStatement(billingMonth);
    setSending(null);
    setNote(
      response.success
        ? { month: billingMonth, tone: 'good', text: 'Sent. Check your inbox, and your spam folder.' }
        : {
          month: billingMonth,
          tone: 'bad',
          text: isConnectivityError(response)
            ? 'No connection - the statement was not sent.'
            : response.error || 'Could not send the statement.',
        },
    );
  };

  let body;
  if (loading) {
    body = <div className={styles.message}><Spinner label="Loading statements" /></div>;
  } else if (loadFailed) {
    // A failed read is not an empty account - say which it is.
    body = <Row icon="cloud-offline-outline" label="Can't load statements" subtitle="Check your connection" onClick={load} />;
  } else if (invoices.length === 0) {
    body = <Row icon="document-text-outline" label="No statements yet" subtitle="One is made when a month ends" />;
  } else {
    body = invoices.map((invoice) => {
      const status = STATUS[invoice.status] || STATUS.DRAFT;
      const month = invoice.billingMonth;
      // The server refuses to email a month that has not ended.
      const canEmail = invoice.status !== 'DRAFT';
      const rowNote = note?.month === month ? note : null;
      return (
        <div key={month}>
          <Row
            icon="document-text-outline"
            label={formatMonthName(month)}
            subtitle={`${Number(invoice.totalKwh || 0).toFixed(2)} kWh`}
            value={`₱${Number(invoice.totalAmountDue || 0).toFixed(2)}`}
            action={(
              <>
                <Badge tone={status.tone}>{status.label}</Badge>
                {canEmail ? (
                  sending === month ? (
                    <span className={styles.sending}><Spinner label="Sending" /></span>
                  ) : (
                    <RowButton
                      icon="mail-outline"
                      label={`Email the ${formatMonthName(month)} statement to me`}
                      onClick={() => handleEmail(month)}
                    />
                  )
                ) : <span className={styles.placeholder} aria-hidden="true" />}
              </>
            )}
          />
          {rowNote ? (
            <p className={`${styles.note} ${rowNote.tone === 'good' ? styles.noteGood : styles.noteBad}`}>
              {rowNote.text}
            </p>
          ) : null}
        </div>
      );
    });
  }

  return (
    <Section title="Statements" count={!loading && !loadFailed && invoices.length ? invoices.length : null}>
      {body}
    </Section>
  );
};

export default StatementsSection;
