import { useState } from 'react';
import usePowerSafety from '../screens/PowerSafetyManagement/hooks/usePowerSafety';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import {
  formatAlertTime,
  getAlertIcon,
  getSafetyStageConfig,
  getStatusColor,
} from '../screens/PowerSafetyManagement/utils/safetyHelpers';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/Field';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import safetyStyles from './SafetyPage.module.css';

// safetyService clamps whatever is saved to this, matching the firmware's
// per-outlet limit. Offering a higher number in the form would be a lie.
const MAX_POWER_W = 500;

/*
 * Shown instead of a threshold verdict when no telemetry has arrived recently.
 *
 * An unplugged ESP32 leaves 0.0 V on the outlet document, and 0 is below every
 * voltage minimum, so the rule quite correctly called it Critical — while the
 * banner above said "All systems operating within safe parameters", because the
 * stage comes from the backend's safety document and that had not moved. Zero
 * volts from a device that is not reporting is not a dangerous reading, it is
 * the absence of one, and the page should not grade it.
 *
 * Distinct from the case §11 of the phone handoff calls out: 240 V with 0.00 A
 * while the relay is off IS a real measurement — the PZEM sits on the mains side
 * — and still gets graded normally, because telemetry is arriving.
 */
const NO_READING = { label: 'No reading', bg: 'var(--ww-grid)', color: 'var(--ww-text-light)' };

const readingRow = (outletLabel, readings, thresholds, fresh) => [
  {
    key: `${outletLabel}-voltage`,
    label: 'Voltage',
    value: readings.voltage,
    unit: 'V',
    digits: 1,
    status: fresh ? getStatusColor(readings.voltage, thresholds.voltage) : NO_READING,
  },
  {
    key: `${outletLabel}-current`,
    label: 'Current',
    value: readings.current,
    unit: 'A',
    digits: 2,
    status: fresh ? getStatusColor(readings.current, thresholds.current) : NO_READING,
  },
  {
    key: `${outletLabel}-power`,
    label: 'Power',
    value: readings.power,
    unit: 'W',
    digits: 1,
    status: fresh ? getStatusColor(readings.power, thresholds.power) : NO_READING,
  },
];

export const SafetyPage = () => {
  // Same outlet subscription usePowerSafety already listens to, so the Firestore
  // SDK serves both from one watch target rather than opening a second.
  const { telemetryFresh } = useLiveOutlets({ withRates: false });
  const {
    safetyStage,
    outlet1Status,
    outlet2Status,
    thresholds,
    protectionEnabled,
    alertHistory,
    loading,
    handleToggleProtection,
    handleSaveThresholds,
  } = usePowerSafety();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /**
   * Seeded once, when the editor is opened — never from the live document.
   *
   * `thresholds` arrives on a snapshot listener, and the backend rewrites the
   * safety document on roughly every telemetry post. Re-seeding on each new
   * `thresholds` object would wipe whatever the user had typed, seconds after
   * they typed it.
   */
  const openEditor = () => {
    setError('');
    setDraft({
      voltageMin: String(thresholds.voltage.min),
      voltageMax: String(thresholds.voltage.max),
      currentMax: String(thresholds.current.max),
      powerMax: String(thresholds.power.max),
    });
    setOpen(true);
  };

  const stage = getSafetyStageConfig(safetyStage);

  /*
   * Clear-on-edit, same as the auth forms. "Minimum voltage must be below the
   * maximum." staying put while the user fixes the minimum is the same
   * contradiction, and this editor can produce it on any of four fields.
   */
  const editDraft = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    setError((current) => (current ? '' : current));
  };

  const save = async () => {
    setError('');

    const next = {
      voltage: { min: Number(draft.voltageMin), max: Number(draft.voltageMax) },
      current: { max: Number(draft.currentMax) },
      // Clamped, not rejected. safetyService clamps to the same figure on write,
      // and the thresholds this form is seeded from fall back to 2000 W when the
      // safety document cannot be read — rejecting that would leave the editor
      // permanently unsaveable. Math.min leaves NaN alone for the check below.
      power: { max: Math.min(Number(draft.powerMax), MAX_POWER_W) },
    };

    const allFinite = [
      next.voltage.min,
      next.voltage.max,
      next.current.max,
      next.power.max,
    ].every((value) => Number.isFinite(value) && value > 0);

    if (!allFinite) {
      setError('Every threshold needs a number above zero.');
      return;
    }

    if (next.voltage.min >= next.voltage.max) {
      setError('Minimum voltage must be below the maximum.');
      return;
    }

    setSaving(true);
    const result = await handleSaveThresholds(next);
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not save the thresholds.');
      return;
    }

    setOpen(false);
  };

  if (loading && !alertHistory.length && safetyStage === 'normal') {
    return <Spinner label="Loading safety state" />;
  }

  return (
    <div className={styles.page}>
      <div
        className={safetyStyles.stage}
        style={{ background: stage.bgColor, borderColor: stage.color }}
      >
        <div>
          <p className={safetyStyles.stageLabel} style={{ color: stage.color }}>
            {stage.label}
          </p>
          <p className={safetyStyles.stageDescription}>{stage.description}</p>
        </div>
        <div className={safetyStyles.stageControl}>
          <span className={styles.muted}>Auto cut-off</span>
          <Switch
            checked={protectionEnabled}
            onChange={handleToggleProtection}
            label="Automatic protection"
          />
        </div>
      </div>

      {!protectionEnabled ? (
        <Banner tone="alert" title="Automatic cut-off is off.">
          WattWise will still warn you, but it will not switch an outlet off when a threshold is
          crossed.
        </Banner>
      ) : null}

      <div className={styles.split}>
        <div className={styles.stack}>
          <div className={styles.pair}>
            {[
              { label: 'Outlet 1', readings: outlet1Status },
              { label: 'Outlet 2', readings: outlet2Status },
            ].map((outlet) => (
              <Card key={outlet.label}>
                <CardHeader
                  title={outlet.label}
                  subtitle={
                    telemetryFresh
                      ? 'Live against your thresholds'
                      : 'Waiting for the ESP32 to report'
                  }
                />
                <div className={styles.stack}>
                  {readingRow(outlet.label, outlet.readings, thresholds, telemetryFresh).map((reading) => (
                    <div key={reading.key} className={safetyStyles.reading}>
                      <div className={safetyStyles.readingHead}>
                        <span className={safetyStyles.readingLabel}>{reading.label}</span>
                        <span
                          className={safetyStyles.readingChip}
                          style={{ background: reading.status.bg, color: reading.status.color }}
                        >
                          {reading.status.label}
                        </span>
                      </div>
                      <p className={safetyStyles.readingValue}>
                        <span className="ww-num">{reading.value.toFixed(reading.digits)}</span>
                        <span className={safetyStyles.readingUnit}>{reading.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Alert history"
              subtitle="Recorded when a threshold was crossed or the cut-off fired."
            />
            {alertHistory.length === 0 ? (
              <EmptyState icon="🛡️" title="No safety alerts">
                Nothing has crossed a threshold. This is the state you want.
              </EmptyState>
            ) : (
              <ul className={safetyStyles.alerts}>
                {alertHistory.map((alert) => {
                  const icon = getAlertIcon(alert.type);
                  return (
                    <li key={alert.id} className={safetyStyles.alert}>
                      <span
                        className={safetyStyles.alertIcon}
                        style={{ background: icon.bg, color: icon.color }}
                        aria-hidden="true"
                      >
                        ⚠
                      </span>
                      <div className={safetyStyles.alertBody}>
                        <p className={safetyStyles.alertTitle}>{alert.title}</p>
                        <p className={safetyStyles.alertMessage}>{alert.message}</p>
                      </div>
                      <div className={safetyStyles.alertMeta}>
                        {alert.outlet ? <Badge tone="neutral">Outlet {alert.outlet}</Badge> : null}
                        <span className={styles.muted}>{formatAlertTime(alert.timestamp)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Thresholds"
            action={
              <Button size="sm" variant="secondary" onClick={openEditor}>
                Edit
              </Button>
            }
          />
          <dl className={safetyStyles.thresholds}>
            <div className={safetyStyles.thresholdRow}>
              <dt>Voltage</dt>
              <dd className="ww-num">
                {thresholds.voltage.min} – {thresholds.voltage.max} V
              </dd>
            </div>
            <div className={safetyStyles.thresholdRow}>
              <dt>Current</dt>
              <dd className="ww-num">max {thresholds.current.max} A</dd>
            </div>
            <div className={safetyStyles.thresholdRow}>
              <dt>Power</dt>
              <dd className="ww-num">max {thresholds.power.max} W</dd>
            </div>
          </dl>
          <p className={styles.muted} style={{ marginTop: 12 }}>
            The firmware enforces a hard limit of {MAX_POWER_W} W per outlet and 1000 W in total,
            regardless of what is set here.
          </p>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Safety thresholds"
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
        {draft ? (
          <div className={styles.stack}>
            {error ? <Banner tone="alert">{error}</Banner> : null}
            <div className={styles.formGrid}>
              <TextField
                label="Voltage min"
                type="number"
                suffix="V"
                value={draft.voltageMin}
                onChange={editDraft('voltageMin')}
              />
              <TextField
                label="Voltage max"
                type="number"
                suffix="V"
                value={draft.voltageMax}
                onChange={editDraft('voltageMax')}
              />
              <TextField
                label="Current max"
                type="number"
                step="0.1"
                suffix="A"
                value={draft.currentMax}
                onChange={editDraft('currentMax')}
              />
              <TextField
                label="Power max"
                type="number"
                max={MAX_POWER_W}
                suffix="W"
                value={draft.powerMax}
                onChange={editDraft('powerMax')}
                hint={`Anything higher saves as ${MAX_POWER_W} W`}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default SafetyPage;
