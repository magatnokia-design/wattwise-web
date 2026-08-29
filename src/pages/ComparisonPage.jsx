import { useState } from 'react';
import useReferenceComparison from '../screens/ReferenceComparison/hooks/useReferenceComparison';
import {
  buildTrend,
  explainAccuracy,
  formatMonthLabel,
} from '../screens/ReferenceComparison/utils/comparisonHelpers';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/Field';
import { Badge, Banner, EmptyState, OfflineState, Spinner } from '../components/ui/Feedback';
import { useMonthStrip } from '../hooks/useMonthStrip';
import MonthRail from '../components/comparison/MonthRail';
import styles from './page.module.css';
import comparisonStyles from './ComparisonPage.module.css';

const DELTAS = [
  { key: 'energy', label: 'Energy', unit: ' kWh', digits: 2 },
  { key: 'cost', label: 'Cost', currency: true },
  { key: 'outlet1', label: 'Outlet 1', unit: ' kWh', digits: 2 },
  { key: 'outlet2', label: 'Outlet 2', unit: ' kWh', digits: 2 },
];

// Which field on the month's totals each row reads. The measured figure is
// always the selected month's own total; the delta beside it is what changed.
const TOTAL_FIELD = { energy: 'kWh', cost: 'cost', outlet1: 'outlet1', outlet2: 'outlet2' };

const EMPTY_BILL = { kWh: '', cost: '', outlet1: '', outlet2: '' };

export const ComparisonPage = () => {
  const {
    monthOptions,
    month,
    previousMonth,
    totals,
    previousTotals,
    comparison,
    actualBill,
    accuracy,
    loading,
    error,
    showOfflineState,
    selectMonth,
    saveActualBill,
    deleteActualBill,
  } = useReferenceComparison();

  const { monthTotals, loadingStrip } = useMonthStrip(monthOptions);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BILL);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Removing a bill is destructive and silent — the row is gone and the
  // accuracy check with it — so it asks first. The phone app has always
  // confirmed here; the web client went straight to the delete.
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const monthLabel = formatMonthLabel(month);
  const previousLabel = formatMonthLabel(previousMonth);
  const trend = buildTrend(comparison, monthLabel, previousLabel, {
    recorded: totals.daysRecorded,
    previousRecorded: previousTotals.daysRecorded,
  });
  const hasUsage = totals.daysRecorded > 0;

  const openForm = () => {
    setForm({
      kWh: actualBill?.totalKWh ? String(actualBill.totalKWh) : '',
      cost: actualBill?.totalCost ? String(actualBill.totalCost) : '',
      outlet1: actualBill?.outlet1KWh ? String(actualBill.outlet1KWh) : '',
      outlet2: actualBill?.outlet2KWh ? String(actualBill.outlet2KWh) : '',
    });
    setFormError('');
    setOpen(true);
  };

  const save = async () => {
    const kWh = parseFloat(form.kWh);
    const cost = parseFloat(form.cost);

    if (!Number.isFinite(kWh) || !Number.isFinite(cost) || kWh <= 0 || cost <= 0) {
      setFormError('Enter the total kWh and total amount from the printed bill.');
      return;
    }

    setSaving(true);
    const result = await saveActualBill({
      kWh,
      cost,
      outlet1: parseFloat(form.outlet1) || 0,
      outlet2: parseFloat(form.outlet2) || 0,
    });
    setSaving(false);

    if (!result.success) {
      setFormError(result.error || 'Could not save the bill.');
      return;
    }

    setOpen(false);
  };

  const remove = async () => {
    setRemoving(true);
    setRemoveError('');
    const result = await deleteActualBill();
    setRemoving(false);

    if (!result?.success) {
      setRemoveError(result?.error || 'Could not remove the bill.');
      return;
    }

    setConfirmRemove(false);
  };

  /*
   * One row per metric: the selected month's measured figure, with the change
   * from the preceding month beside it *only* when that month was measured.
   *
   * The delta is gated on `bothHaveData`, never on `hasData`. Gating it on the
   * looser flag once printed "↑ 0.20 kWh" against a baseline of "May 2026: 0.00
   * kWh" for a month that was never measured at all, under a heading that
   * simultaneously said there was not enough data — absence rendered as a
   * measurement of zero, the same mistake as grading an unplugged outlet's
   * 0.0 V.
   */
  const renderMetric = (key) => {
    const config = DELTAS.find((entry) => entry.key === key);
    const delta = comparison[key];
    const value = Number(totals[TOTAL_FIELD[key]]) || 0;

    const formatValue = (input) =>
      config.currency ? formatCurrency(input) : `${input.toFixed(config.digits)}${config.unit}`;

    const isGood = delta.direction === 'down';
    // While the month is still running the arrows stay factual but lose their
    // verdict colour, for the same reason the headline does: a lower total on
    // the second of the month is the missing days, not a saving.
    const tone = delta.direction === 'flat' || trend.partial
      ? 'neutral'
      : isGood ? 'good' : 'alert';

    return (
      <div key={key} className={comparisonStyles.delta}>
        <p className={comparisonStyles.deltaLabel}>{config.label}</p>
        <p className={comparisonStyles.deltaValue}>
          <span className="ww-num">{formatValue(value)}</span>
        </p>

        {trend.available ? (
          <>
            <div className={styles.row}>
              <Badge tone={tone}>
                {delta.direction === 'flat'
                  ? 'No change'
                  : `${isGood ? '↓' : '↑'} ${formatValue(delta.absolute)}`}
              </Badge>
              {delta.absolutePercent !== null ? (
                <span className={styles.muted}>
                  <span className="ww-num">{delta.absolutePercent.toFixed(1)}%</span>
                </span>
              ) : null}
            </div>
            <p className={comparisonStyles.deltaBaseline}>
              {previousLabel}: <span className="ww-num">{formatValue(delta.previous)}</span>
            </p>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <p className={styles.lede}>
          Pick one month. Everything below is about that month: what the hardware measured, how
          that compares with the month before it, and how the estimate lines up with the PELCO III
          bill covering the same electricity.
        </p>
      </div>

      {error ? <Banner tone="alert">{error}</Banner> : null}

      <Card>
        <MonthRail
          monthOptions={monthOptions}
          monthTotals={monthTotals}
          month={month}
          onSelect={selectMonth}
          loading={loadingStrip}
        />
      </Card>

      {loading ? (
        <Spinner label="Loading month" />
      ) : (
        <>
          <Card>
            <CardHeader
              title={`What WattWise measured — ${monthLabel}`}
              subtitle={
                hasUsage
                  ? `${totals.daysRecorded} ${totals.daysRecorded === 1 ? 'day' : 'days'} recorded, from outlet 1 and outlet 2 only.`
                  : undefined
              }
            />

            {hasUsage ? (
              <>
                {/* The month-on-month line. Bordered and toned when there is a
                    real change to report; a quiet sentence when the preceding
                    month has nothing, because "no baseline" is not a finding
                    and should not be dressed as one. */}
                {trend.available ? (
                  <div className={comparisonStyles.trend} data-tone={trend.tone}>
                    <p className={comparisonStyles.trendHeadline}>{trend.headline}</p>
                    <p className={comparisonStyles.trendDetail}>{trend.detail}</p>
                  </div>
                ) : (
                  <p className={comparisonStyles.trendMuted}>{trend.detail}</p>
                )}

                <div className={comparisonStyles.deltaGrid}>
                  {DELTAS.map((entry) => renderMetric(entry.key))}
                </div>
              </>
            ) : showOfflineState ? (
              // "Nothing recorded" asserts something about the account. With no
              // read behind it, a full month looks identical to one that
              // genuinely has no days - which is how August reported as empty.
              <OfflineState title={`Can't load ${monthLabel}`}>
                This month&apos;s readings live on your account, and the page needs a connection to
                read them. Nothing has been lost.
              </OfflineState>
            ) : (
              <EmptyState icon="⚖️" title={`Nothing recorded for ${monthLabel}`}>
                A month appears here once the nightly rollup has written at least one day for it.
                You can still file that month&apos;s PELCO III bill below.
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader
              title={`Actual PELCO III bill — ${monthLabel}`}
              subtitle="The only check that grades WattWise's estimate against the real thing."
              action={
                <div className={styles.row}>
                  <Button size="sm" variant="secondary" onClick={openForm}>
                    {actualBill ? 'Edit' : 'Enter bill'}
                  </Button>
                  {actualBill ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setRemoveError('');
                        setConfirmRemove(true);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              }
            />

            {accuracy && !hasUsage ? (
              /*
                A bill filed against a month WattWise never measured — which is
                the normal case for anyone entering an old bill, and the case
                this screen actively encourages. Running it through the rows
                below would print "WattWise estimated ₱0.00" and score the gap
                at 100%, reporting an absence of data as a total failure of the
                estimate. So the estimate line says what is true instead.
              */
              <div className={comparisonStyles.accuracy}>
                <div className={comparisonStyles.accuracyRow}>
                  <span>PELCO III billed</span>
                  <strong className="ww-num">{formatCurrency(accuracy.actualCost)}</strong>
                </div>
                <div className={comparisonStyles.accuracyRow}>
                  <span>WattWise measured</span>
                  <strong>Nothing yet</strong>
                </div>
                <p className={comparisonStyles.accuracyNote}>
                  Your {monthLabel} bill is saved. WattWise has no recorded usage for that month, so
                  there is nothing to grade it against yet — the check appears once the outlets have
                  reported for a full day of that month.
                </p>
              </div>
            ) : accuracy ? (
              <div className={comparisonStyles.accuracy}>
                <div className={comparisonStyles.accuracyRow}>
                  <span>WattWise estimated</span>
                  <strong className="ww-num">{formatCurrency(accuracy.estimatedCost)}</strong>
                </div>
                <div className={comparisonStyles.accuracyRow}>
                  <span>PELCO III billed</span>
                  <strong className="ww-num">{formatCurrency(accuracy.actualCost)}</strong>
                </div>
                {/*
                  The scope gap, stated as a fact and given no colour.

                  This row used to carry the 5% badge, which made it a permanent
                  false alarm: it grades pesos measured over different energy —
                  a whole-apartment bill against two outlets — so it could never
                  pass for anyone. The owner's card read "−₱1173.85 (99.2%) ·
                  Outside the expected 5% band" directly above a paragraph
                  explaining the gap was expected.

                  Relabelled rather than removed. The number is real and worth
                  seeing; what was wrong was calling it an inaccuracy.
                */}
                <div className={`${comparisonStyles.accuracyRow} ${comparisonStyles.accuracyTotal}`}>
                  <span>
                    {accuracy.measuresLessThanBill ? 'Not measured by WattWise' : 'Difference'}
                  </span>
                  <strong className="ww-num">
                    {accuracy.direction === 'over' ? '+' : '−'}
                    {formatCurrency(accuracy.absolute)} ({accuracy.absolutePercent.toFixed(1)}%)
                  </strong>
                </div>

                {/*
                  The grade, on its own terms: the bill's own kWh priced by the
                  same tariff, against what the bill charged. This is the row
                  allowed to go amber, because it is the only one here that can
                  fail for a reason worth acting on.

                  Null when the stored bill carries no kWh — no check to report,
                  which is not the same as a failed one, so no badge at all.
                */}
                {accuracy.modelCheck ? (
                  <div className={comparisonStyles.modelCheck}>
                    <div className={comparisonStyles.accuracyRow}>
                      <span>
                        WattWise&apos;s rates on the bill&apos;s own{' '}
                        {accuracy.modelCheck.billedKWh.toFixed(0)} kWh
                      </span>
                      <strong className="ww-num">
                        {formatCurrency(accuracy.modelCheck.modelledCost)}
                      </strong>
                    </div>
                    <div className={comparisonStyles.accuracyRow}>
                      <span>Rate accuracy</span>
                      <strong className="ww-num">
                        {accuracy.modelCheck.direction === 'over' ? '+' : '−'}
                        {formatCurrency(accuracy.modelCheck.absolute)} (
                        {accuracy.modelCheck.absolutePercent.toFixed(1)}%)
                      </strong>
                    </div>
                    <Badge tone={accuracy.modelCheck.isClose ? 'good' : 'warn'}>
                      {accuracy.modelCheck.isClose
                        ? 'Within the 5% band the billing model expects'
                        : 'Outside the expected 5% band'}
                    </Badge>
                  </div>
                ) : null}

                {/*
                  The badge states the verdict; this states why, which is the
                  part a reader actually needs. A large gap here is almost
                  always scope — the bill covers the apartment, WattWise covers
                  two outlets — and that is not something the badge can convey.

                  From comparisonHelpers rather than written here, so both
                  clients answer identically. "Why is it 98.9% off" is the first
                  question anyone asks about this screen, and two clients
                  answering it differently would be worse than either answer.
                */}
                <p className={comparisonStyles.accuracyNote}>
                  {explainAccuracy(accuracy, monthLabel)}
                </p>
              </div>
            ) : (
              <EmptyState icon="🧾" title={`No bill on file for ${monthLabel}`}>
                Type in the total kWh and amount from the bill covering {monthLabel}&apos;s
                electricity. Bills from before you owned the hub work too — that is how this screen
                has something to check against on day one.
              </EmptyState>
            )}
          </Card>
        </>
      )}

      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove the ${monthLabel} bill?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={removing} onClick={remove}>
              Remove
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {removeError ? <Banner tone="alert">{removeError}</Banner> : null}
          <p>
            This deletes the PELCO III figures you saved for {monthLabel}, and the accuracy check
            with them. Your measured usage is not affected — that comes from the hardware, not from
            this form.
          </p>
        </div>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`PELCO III bill — ${monthLabel}`}
        width={520}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {formError ? <Banner tone="alert">{formError}</Banner> : null}

          {/* The one thing on this form a user can get wrong in a way that
              silently corrupts the comparison. A bill arrives the month after
              the electricity was used, so filing the paper in your hand under
              the current month lines PELCO's previous month up against
              WattWise's current one, and the gap gets reported as error. */}
          <Banner tone="warn">
            File this under the month the electricity was <strong>used</strong>, not the month the
            bill arrived. Check the billing period printed on it — a bill received now usually
            covers last month.
          </Banner>

          <div className={styles.formGrid}>
            <TextField
              label="Total kWh"
              type="number"
              step="0.01"
              suffix="kWh"
              value={form.kWh}
              onChange={(event) => setForm({ ...form, kWh: event.target.value })}
            />
            <TextField
              label="Total amount"
              type="number"
              step="0.01"
              prefix="₱"
              value={form.cost}
              onChange={(event) => setForm({ ...form, cost: event.target.value })}
            />
          </div>
          <p className={styles.muted}>
            Optional — if you track them separately, the per-outlet split from your own records.
          </p>
          <div className={styles.formGrid}>
            <TextField
              label="Outlet 1"
              type="number"
              step="0.01"
              suffix="kWh"
              value={form.outlet1}
              onChange={(event) => setForm({ ...form, outlet1: event.target.value })}
            />
            <TextField
              label="Outlet 2"
              type="number"
              step="0.01"
              suffix="kWh"
              value={form.outlet2}
              onChange={(event) => setForm({ ...form, outlet2: event.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ComparisonPage;
