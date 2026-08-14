import { useState } from 'react';
import useReferenceComparison from '../screens/ReferenceComparison/hooks/useReferenceComparison';
import {
  buildVerdict,
  explainAccuracy,
  formatMonthLabel,
} from '../screens/ReferenceComparison/utils/comparisonHelpers';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/Field';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
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

// Which field on a month's totals each delta reads, for the case where there is
// only one month to show and no delta to take.
const TOTAL_FIELD = { energy: 'kWh', cost: 'cost', outlet1: 'outlet1', outlet2: 'outlet2' };

const EMPTY_BILL = { kWh: '', cost: '', outlet1: '', outlet2: '' };

export const ComparisonPage = () => {
  const {
    monthOptions,
    monthA,
    monthB,
    totalsA,
    totalsB,
    comparison,
    actualBill,
    accuracy,
    loading,
    error,
    selectMonthA,
    selectMonthB,
    saveActualBill,
    deleteActualBill,
  } = useReferenceComparison();

  const { monthTotals, loadingStrip } = useMonthStrip(monthOptions);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BILL);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const monthALabel = formatMonthLabel(monthA);
  const monthBLabel = formatMonthLabel(monthB);
  const verdict = buildVerdict(comparison, monthALabel, monthBLabel);

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

  /*
   * The one-month case. `hasData` is true when *either* month has days
   * recorded, but a delta needs both — so gating the delta grid on it printed
   * "↑ 0.20 kWh" against a baseline of "May 2026: 0.00 kWh" for a month that
   * was never measured at all, under a heading that simultaneously said "Not
   * enough data yet". Absence of data shown as a measurement of zero, which is
   * the same mistake as grading an unplugged outlet's 0.0 V.
   *
   * So: totals on their own, no delta, no baseline, and the empty month named.
   */
  const recordedTotals = totalsA.daysRecorded > 0 ? totalsA : totalsB;
  const recordedLabel = totalsA.daysRecorded > 0 ? monthALabel : monthBLabel;
  const unrecordedLabel = totalsA.daysRecorded > 0 ? monthBLabel : monthALabel;

  const renderTotal = (key) => {
    const config = DELTAS.find((entry) => entry.key === key);
    const value = Number(recordedTotals[TOTAL_FIELD[key]]) || 0;

    return (
      <div key={key} className={comparisonStyles.delta}>
        <p className={comparisonStyles.deltaLabel}>{config.label}</p>
        <p className={comparisonStyles.deltaValue}>
          <span className="ww-num">
            {config.currency ? formatCurrency(value) : `${value.toFixed(config.digits)}${config.unit}`}
          </span>
        </p>
      </div>
    );
  };

  const renderDelta = (key) => {
    const delta = comparison[key];
    const config = DELTAS.find((entry) => entry.key === key);
    const isGood = delta.direction === 'down';
    const tone = delta.direction === 'flat' ? 'neutral' : isGood ? 'good' : 'alert';

    const formatValue = (value) =>
      config.currency ? formatCurrency(value) : `${value.toFixed(config.digits)}${config.unit}`;

    return (
      <div key={key} className={comparisonStyles.delta}>
        <p className={comparisonStyles.deltaLabel}>{config.label}</p>
        <p className={comparisonStyles.deltaValue}>
          <span className="ww-num">{formatValue(delta.current)}</span>
        </p>
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
          {monthBLabel}: <span className="ww-num">{formatValue(delta.previous)}</span>
        </p>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageIntro}>
        <p className={styles.lede}>
          Compares what the hardware actually measured in each month. Both sides come from the daily
          rollups, not from anything typed in.
        </p>
      </div>

      {error ? <Banner tone="alert">{error}</Banner> : null}

      <Card>
        <MonthRail
          monthOptions={monthOptions}
          monthTotals={monthTotals}
          monthA={monthA}
          monthB={monthB}
          onSelectA={selectMonthA}
          onSelectB={selectMonthB}
          loading={loadingStrip}
        />
      </Card>

      {loading ? (
        <Spinner label="Loading months" />
      ) : (
        <>
          <div
            className={comparisonStyles.verdict}
            data-tone={verdict.tone}
          >
            <p className={comparisonStyles.verdictHeadline}>{verdict.headline}</p>
            <p className={comparisonStyles.verdictDetail}>{verdict.detail}</p>
          </div>

          {comparison.bothHaveData ? (
            <Card>
              <CardHeader
                title={`${monthALabel} vs ${monthBLabel}`}
                subtitle={`${totalsA.daysRecorded} days recorded in ${monthALabel} · ${totalsB.daysRecorded} in ${monthBLabel}`}
              />
              <div className={comparisonStyles.deltaGrid}>
                {DELTAS.map((entry) => renderDelta(entry.key))}
              </div>
            </Card>
          ) : comparison.hasData ? (
            <Card>
              <CardHeader
                title={`${recordedLabel} on its own`}
                subtitle={`${unrecordedLabel} has no recorded usage, so there is nothing to compare against yet. These are ${recordedLabel}'s totals.`}
              />
              <div className={comparisonStyles.deltaGrid}>
                {DELTAS.map((entry) => renderTotal(entry.key))}
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState icon="⚖️" title="Nothing recorded for these months">
                A month becomes comparable once the nightly rollup has written at least one day for
                it.
              </EmptyState>
            </Card>
          )}

          <Card>
            <CardHeader
              title={`Actual PELCO III bill — ${monthALabel}`}
              subtitle="The only check that grades WattWise's estimate against the real thing."
              action={
                <div className={styles.row}>
                  <Button size="sm" variant="secondary" onClick={openForm}>
                    {actualBill ? 'Edit' : 'Enter bill'}
                  </Button>
                  {actualBill ? (
                    <Button size="sm" variant="danger" onClick={deleteActualBill}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              }
            />

            {accuracy ? (
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
                  {explainAccuracy(accuracy, monthALabel)}
                </p>
              </div>
            ) : (
              <EmptyState icon="🧾" title="No bill on file for this month">
                Type in the total kWh and amount from your paper bill to see how close WattWise came.
              </EmptyState>
            )}
          </Card>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`PELCO III bill — ${monthALabel}`}
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
