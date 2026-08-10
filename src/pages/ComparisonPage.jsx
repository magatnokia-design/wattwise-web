import { useState } from 'react';
import useReferenceComparison from '../screens/ReferenceComparison/hooks/useReferenceComparison';
import { buildVerdict, formatMonthLabel } from '../screens/ReferenceComparison/utils/comparisonHelpers';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TextField, SelectField } from '../components/ui/Field';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import comparisonStyles from './ComparisonPage.module.css';

const DELTAS = [
  { key: 'energy', label: 'Energy', unit: ' kWh', digits: 2 },
  { key: 'cost', label: 'Cost', currency: true },
  { key: 'outlet1', label: 'Outlet 1', unit: ' kWh', digits: 2 },
  { key: 'outlet2', label: 'Outlet 2', unit: ' kWh', digits: 2 },
];

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

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BILL);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const monthALabel = formatMonthLabel(monthA);
  const monthBLabel = formatMonthLabel(monthB);
  const verdict = buildVerdict(comparison, monthALabel, monthBLabel);

  const selectOptions = monthOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }));

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
        <div className={styles.formGrid}>
          <SelectField
            label="Month"
            value={monthA}
            onChange={(event) => selectMonthA(event.target.value)}
            options={selectOptions}
          />
          <SelectField
            label="Compared with"
            value={monthB}
            onChange={(event) => selectMonthB(event.target.value)}
            options={selectOptions}
          />
        </div>
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

          {comparison.hasData ? (
            <Card>
              <CardHeader
                title={`${monthALabel} vs ${monthBLabel}`}
                subtitle={`${totalsA.daysRecorded} days recorded in ${monthALabel} · ${totalsB.daysRecorded} in ${monthBLabel}`}
              />
              <div className={comparisonStyles.deltaGrid}>
                {DELTAS.map((entry) => renderDelta(entry.key))}
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
                <div className={`${comparisonStyles.accuracyRow} ${comparisonStyles.accuracyTotal}`}>
                  <span>Difference</span>
                  <strong className="ww-num">
                    {accuracy.direction === 'over' ? '+' : '−'}
                    {formatCurrency(accuracy.absolute)} ({accuracy.absolutePercent.toFixed(1)}%)
                  </strong>
                </div>
                <Badge tone={accuracy.isClose ? 'good' : 'warn'}>
                  {accuracy.isClose
                    ? 'Within the 5% band the billing model expects'
                    : 'Outside the expected 5% band'}
                </Badge>
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
