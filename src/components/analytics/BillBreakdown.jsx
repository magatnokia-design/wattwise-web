import { formatCurrency } from '../../screens/BudgetTracking/utils/budgetHelpers';
import { RATE_EFFECTIVE_DATE } from '../../utils/billing';
import styles from './BillBreakdown.module.css';

/**
 * The PELCO III bill, block by block, exactly as calculatePelcoIIIBill returns
 * it. Nothing is recomputed here — this component only renders the object.
 *
 * PELCO III is the billing basis and the user is entitled to see it, so this is
 * a full itemisation rather than a single total. Block 1 is what they enter in
 * Settings; Blocks 2 and 3 are ERC constants.
 */
const BLOCKS = [
  {
    key: 'generationTransmission',
    title: 'Generation & Transmission',
    note: 'Block 1 — the rates you enter each month from pelco3.org',
    totalKey: 'generationTransmission',
  },
  {
    key: 'distribution',
    title: 'Distribution',
    note: 'Block 2 — ERC-approved, fixed',
    totalKey: 'distribution',
  },
  {
    key: 'government',
    title: 'Government charges',
    note: 'Block 3 — universal charges and VAT',
    totalKey: 'government',
  },
];

export const BillBreakdown = ({ bill, isEstimate = false }) => {
  if (!bill) return null;

  const { items, totals, kwh, effectiveRate, rateProfileName } = bill;

  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <div>
          <p className={styles.summaryLabel}>Total for {kwh.toFixed(3)} kWh</p>
          <p className={styles.summaryValue}>
            <span className="ww-num">{formatCurrency(totals.total)}</span>
          </p>
        </div>
        <div className={styles.summaryRate}>
          <p className={styles.summaryLabel}>Effective rate</p>
          <p className={styles.summaryRateValue}>
            <span className="ww-num">{formatCurrency(effectiveRate)}</span>/kWh
          </p>
        </div>
      </div>

      {BLOCKS.map((block) => {
        const lines = items?.[block.key] || [];
        if (!lines.length) return null;

        return (
          <section key={block.key} className={styles.block}>
            <header className={styles.blockHead}>
              <div>
                <h3 className={styles.blockTitle}>{block.title}</h3>
                <p className={styles.blockNote}>{block.note}</p>
              </div>
              <p className={styles.blockTotal}>
                <span className="ww-num">{formatCurrency(totals[block.totalKey])}</span>
              </p>
            </header>

            <dl className={styles.lines}>
              {lines.map((line) => (
                <div key={line.key} className={styles.line}>
                  <dt className={styles.lineLabel}>
                    {line.label}
                    <span className={styles.lineRate}>
                      {line.kind === 'perKwh'
                        ? `₱${line.rate.toFixed(4)}/kWh`
                        : line.kind === 'fixed'
                          ? 'per billing period'
                          : `${(line.rate * 100).toFixed(2)}%`}
                    </span>
                  </dt>
                  <dd className={styles.lineValue}>
                    <span className="ww-num">{formatCurrency(line.amount)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      <footer className={styles.footer}>
        <span>
          {rateProfileName} · rates effective {RATE_EFFECTIVE_DATE}
        </span>
        {isEstimate ? <span className={styles.estimate}>Estimate — default rates in use</span> : null}
      </footer>
    </div>
  );
};

export default BillBreakdown;
