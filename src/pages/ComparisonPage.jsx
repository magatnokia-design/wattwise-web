import { useState } from 'react';
import useReferenceComparison from '../screens/ReferenceComparison/hooks/useReferenceComparison';
import {
  buildTrend,
  formatMonthLabel,
  labelCostBasis,
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
        <p className={comparisonStyles.deltaLabel}>
          {config.label}
          {/* Which basis this peso figure came from. Before the month is
              finalized it is an estimate at the rates set in Settings; after,
              it is what the statement billed, and the two are different
              numbers for the same month. */}
          {key === 'cost' && totals.isFinal ? (
            <span className={comparisonStyles.finalPill}>Final</span>
          ) : null}
        </p>
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
              title={monthLabel}
              action={totals.costBasis === 'final' ? <Badge tone="good">Final</Badge> : null}
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
                  </div>
                ) : null}

                <div className={comparisonStyles.deltaGrid}>
                  {DELTAS.map((entry) => renderMetric(entry.key))}
                </div>

                {/* Both months in the change above are priced with the user's
                    configured rates, including this one even after it has been
                    finalized. Swapping in the billed figure for the finalized
                    month alone would measure August's official rates against
                    July's configured ones and report the gap as a change in
                    consumption. So the comparison stays like-for-like and the
                    basis is stated rather than left to be inferred. */}
              </>
            ) : showOfflineState ? (
              // "Nothing recorded" asserts something about the account. With no
              // read behind it, a full month looks identical to one that
              // genuinely has no days - which is how August reported as empty.
              <OfflineState title={`Can't load ${monthLabel}`} />
            ) : (
              <EmptyState icon="git-compare-outline" title={`Nothing recorded for ${monthLabel}`} />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Your PELCO III bill"
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
                A bill filed against a month Dagitab never measured — which is
                the normal case for anyone entering an old bill, and the case
                this screen actively encourages. Running it through the rows
                below would print "Dagitab estimated ₱0.00" and score the gap
                at 100%, reporting an absence of data as a total failure of the
                estimate. So the estimate line says what is true instead.
              */
              <div className={comparisonStyles.accuracy}>
                <div className={comparisonStyles.accuracyRow}>
                  <span>PELCO III billed</span>
                  <strong className="ww-num">{formatCurrency(accuracy.actualCost)}</strong>
                </div>
                <div className={comparisonStyles.accuracyRow}>
                  <span>Dagitab measured</span>
                  <strong>Nothing yet</strong>
                </div>

              </div>
            ) : accuracy ? (
              <div className={comparisonStyles.accuracy}>
                <div className={comparisonStyles.accuracyRow}>
                  {/* Whose figure this is, and on what basis. Once the month is
                      finalized this row is no longer an estimate - it is the
                      same number the statement billed - and calling it one would
                      put a third description of that figure in front of the
                      reader. */}
                  <span>{labelCostBasis(totals.costBasis)}</span>
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
                    {accuracy.measuresLessThanBill ? 'Not measured by Dagitab' : 'Difference'}
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
                        Dagitab&apos;s rates on the bill&apos;s own{' '}
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
                  always scope — the bill covers the apartment, Dagitab covers
                  two outlets — and that is not something the badge can convey.

                  From comparisonHelpers rather than written here, so both
                  clients answer identically. "Why is it 98.9% off" is the first
                  question anyone asks about this screen, and two clients
                  answering it differently would be worse than either answer.
                */}

              </div>
            ) : showOfflineState ? (
              // The bill is a single document, and getMonthData reports a
              // missing one and an unreachable one the same way - both arrive
              // as success:false. So this card cannot tell them apart on its
              // own, and takes the answer from the month read above it.
              <OfflineState title="Can't check for a saved bill" />
            ) : (
              <EmptyState icon="receipt-outline" title={`No bill on file for ${monthLabel}`}>
                Enter the kWh and amount from your bill.
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
          <p>Your measured usage is not affected.</p>
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
              Dagitab's current one, and the gap gets reported as error. */}
          {/* The one mistake that silently corrupts the comparison: a bill
              arrives the month after the electricity was used. */}
          <Banner tone="warn">
            Use the month the electricity was <strong>used</strong> - check the billing period.
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
          <div className={styles.formGrid}>
            <TextField
              label="Outlet 1 (optional)"
              type="number"
              step="0.01"
              suffix="kWh"
              value={form.outlet1}
              onChange={(event) => setForm({ ...form, outlet1: event.target.value })}
            />
            <TextField
              label="Outlet 2 (optional)"
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
