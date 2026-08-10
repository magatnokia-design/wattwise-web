import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../screens/Settings/hooks/useSettings';
import {
  formatAckStatusValue,
  formatDeviceHealthValue,
} from '../screens/Settings/utils/settingsHelpers';
import { authService } from '../services/firebase';
import { auth } from '../services/firebase/config';
import {
  RATE_EFFECTIVE_DATE,
  SUPPLY_RATE_FIELDS,
  normalizeSupplyRates,
  sumSupplyRates,
} from '../utils/billing';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { TextField } from '../components/ui/Field';
import { Badge, Banner, EmptyState, Spinner } from '../components/ui/Feedback';
import styles from './page.module.css';
import settingsStyles from './SettingsPage.module.css';

const HEALTH_TONE = {
  online: 'good',
  delayed: 'warn',
  degraded: 'warn',
  offline: 'alert',
  not_linked: 'neutral',
  unregistered: 'neutral',
};

const ratesToDraft = (rates) => {
  const normalized = normalizeSupplyRates(rates);
  return SUPPLY_RATE_FIELDS.reduce((draft, field) => {
    draft[field.key] = String(normalized[field.key]);
    return draft;
  }, {});
};

export const SettingsPage = () => {
  const {
    settings,
    savedAppliances,
    loading,
    error,
    fetchSettings,
    updateSupplyRates,
    updateNotifications,
    updateDeviceSettings,
    clearDeviceSettings,
    updateOutletName,
    clearOutletDetection,
    removeSavedAppliance,
  } = useSettings();

  const [name, setName] = useState('');
  const [nameStatus, setNameStatus] = useState(null);

  const [rateDraft, setRateDraft] = useState(() => ratesToDraft(null));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rateStatus, setRateStatus] = useState(null);
  const [savingRates, setSavingRates] = useState(false);

  const [outletDraft, setOutletDraft] = useState({ 1: '', 2: '' });
  const [outletStatus, setOutletStatus] = useState(null);

  const [device, setDevice] = useState({ deviceId: '', deviceToken: '' });
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [savingDevice, setSavingDevice] = useState(false);

  useEffect(() => {
    setName(settings.profileName === 'User' ? '' : settings.profileName);
    setRateDraft(ratesToDraft(settings.supplyRates));
    setOutletDraft({ 1: settings.outlet1Name, 2: settings.outlet2Name });
    setDevice({ deviceId: settings.esp32DeviceId, deviceToken: settings.esp32DeviceToken });
  }, [
    settings.profileName,
    settings.supplyRates,
    settings.outlet1Name,
    settings.outlet2Name,
    settings.esp32DeviceId,
    settings.esp32DeviceToken,
  ]);

  const refresh = () => fetchSettings(auth.currentUser?.uid || null);

  const saveName = async () => {
    setNameStatus(null);
    const result = await authService.updateDisplayName(name);
    if (!result.success) {
      setNameStatus({ tone: 'alert', message: result.error });
      return;
    }
    setNameStatus({ tone: 'good', message: 'Name updated.' });
    refresh();
  };

  const saveRates = async () => {
    setRateStatus(null);
    setSavingRates(true);
    const result = await updateSupplyRates(rateDraft);
    setSavingRates(false);

    setRateStatus(
      result.success
        ? { tone: 'good', message: 'Rates saved. Every peso figure now prices against them.' }
        : { tone: 'alert', message: result.error || 'Could not save the rates.' }
    );
  };

  const saveOutletName = async (outletNumber) => {
    setOutletStatus(null);
    const result = await updateOutletName(outletNumber, outletDraft[outletNumber], {
      source: 'manual',
    });
    setOutletStatus(
      result.success
        ? { tone: 'good', message: `Outlet ${outletNumber} renamed.` }
        : { tone: 'alert', message: result.error || 'Could not rename the outlet.' }
    );
  };

  const saveDevice = async () => {
    setDeviceStatus(null);
    setSavingDevice(true);
    const result = await updateDeviceSettings(device);
    setSavingDevice(false);

    setDeviceStatus(
      result.success
        ? { tone: 'good', message: 'Device linked. Telemetry should appear within a second or two.' }
        : { tone: 'alert', message: result.error || 'Could not link the device.' }
    );
  };

  const unlinkDevice = async () => {
    setDeviceStatus(null);
    const result = await clearDeviceSettings();
    setDeviceStatus(
      result.success
        ? { tone: 'warn', message: 'Device unlinked. It will stop reporting to this account.' }
        : { tone: 'alert', message: result.error || 'Could not unlink the device.' }
    );
  };

  const rateTotal = sumSupplyRates(rateDraft);
  const primaryField = SUPPLY_RATE_FIELDS.find((field) => field.primary);
  const advancedFields = SUPPLY_RATE_FIELDS.filter((field) => !field.primary);

  if (loading && !settings.email) {
    return <Spinner label="Loading settings" />;
  }

  return (
    <div className={styles.page}>
      {error ? <Banner tone="alert">{error}</Banner> : null}

      <div className={styles.split}>
        <div className={styles.stack}>
          {/* Block 1 rates — the only tariff input the user controls, and what
              every peso figure in the app is priced against. */}
          <Card>
            <CardHeader
              title="PELCO III rates"
              subtitle={`Block 1 — generation and transmission. Published monthly at pelco3.org; defaults track ${RATE_EFFECTIVE_DATE}.`}
            />

            {!settings.hasSupplyRates ? (
              <Banner tone="warn" title="Using default rates.">
                Enter the generation rate from your latest bill so estimates match what PELCO III
                actually charges you.
              </Banner>
            ) : null}

            <div className={styles.stack} style={{ marginTop: 16 }}>
              {primaryField ? (
                <TextField
                  label={`${primaryField.label} (the one that moves each month)`}
                  type="number"
                  step="0.0001"
                  prefix="₱"
                  suffix="/kWh"
                  value={rateDraft[primaryField.key] ?? ''}
                  onChange={(event) =>
                    setRateDraft({ ...rateDraft, [primaryField.key]: event.target.value })
                  }
                />
              ) : null}

              <button
                type="button"
                className={settingsStyles.disclosure}
                onClick={() => setShowAdvanced((open) => !open)}
                aria-expanded={showAdvanced}
              >
                {showAdvanced ? '▾' : '▸'} Other Block 1 lines ({advancedFields.length})
              </button>

              {showAdvanced ? (
                <div className={styles.formGrid}>
                  {advancedFields.map((field) => (
                    <TextField
                      key={field.key}
                      label={field.label}
                      type="number"
                      step="0.0001"
                      prefix="₱"
                      value={rateDraft[field.key] ?? ''}
                      onChange={(event) =>
                        setRateDraft({ ...rateDraft, [field.key]: event.target.value })
                      }
                      hint={`Default ${field.defaultValue}`}
                    />
                  ))}
                </div>
              ) : null}

              <div className={settingsStyles.rateTotal}>
                <span>Block 1 total</span>
                <strong className="ww-num">₱{rateTotal.toFixed(4)}/kWh</strong>
              </div>

              {rateStatus ? <Banner tone={rateStatus.tone}>{rateStatus.message}</Banner> : null}

              <div className={styles.rowEnd}>
                <Button
                  variant="secondary"
                  onClick={() => setRateDraft(ratesToDraft(settings.supplyRates))}
                >
                  Reset
                </Button>
                <Button loading={savingRates} onClick={saveRates}>
                  Save rates
                </Button>
              </div>

              <p className={styles.muted}>
                Blocks 2 and 3 (distribution, universal charges, VAT) are ERC constants and are not
                editable — see the breakdown on <Link to="/analytics">Analytics</Link>. Current rates:{' '}
                <a href="https://www.pelco3.org/rates.php" target="_blank" rel="noreferrer">
                  pelco3.org/rates.php
                </a>
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Outlets"
              subtitle="Naming an outlet while its appliance is running also teaches WattWise that appliance's power signature."
            />

            {outletStatus ? <Banner tone={outletStatus.tone}>{outletStatus.message}</Banner> : null}

            <div className={styles.stack} style={{ marginTop: 12 }}>
              {[1, 2].map((outletNumber) => {
                const suggested =
                  outletNumber === 1 ? settings.outlet1SuggestedName : settings.outlet2SuggestedName;
                const confidence =
                  outletNumber === 1
                    ? settings.outlet1SuggestionConfidence
                    : settings.outlet2SuggestionConfidence;

                return (
                  <div key={outletNumber} className={settingsStyles.outletBlock}>
                    <div className={styles.row} style={{ alignItems: 'flex-end' }}>
                      <TextField
                        label={`Outlet ${outletNumber} name`}
                        value={outletDraft[outletNumber] || ''}
                        onChange={(event) =>
                          setOutletDraft({ ...outletDraft, [outletNumber]: event.target.value })
                        }
                        className={settingsStyles.grow}
                      />
                      <Button variant="secondary" onClick={() => saveOutletName(outletNumber)}>
                        Save
                      </Button>
                    </div>

                    {suggested ? (
                      <div className={settingsStyles.suggestionRow}>
                        <span>
                          Detected as <strong>{suggested}</strong>
                          {confidence != null ? ` (${confidence}%)` : ''}
                        </span>
                        <div className={styles.row}>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateOutletName(outletNumber, suggested, {
                                source: 'auto_suggestion',
                                confidencePercent: confidence,
                              }).then(refresh)
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => clearOutletDetection(outletNumber)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Learned appliances"
              subtitle="Signatures WattWise matches future runs against."
            />
            {savedAppliances.length === 0 ? (
              <EmptyState icon="🧠" title="Nothing learned yet">
                Confirm a detection suggestion while an appliance is running and its signature is
                saved here.
              </EmptyState>
            ) : (
              <ul className={settingsStyles.applianceList}>
                {savedAppliances.map((appliance) => (
                  <li key={appliance.label} className={settingsStyles.appliance}>
                    <div>
                      <p className={settingsStyles.applianceName}>{appliance.label}</p>
                      <p className={styles.muted}>
                        <span className="ww-num">{appliance.meanPower.toFixed(1)} W</span> average ·
                        peak <span className="ww-num">{appliance.peakPower.toFixed(1)} W</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeSavedAppliance(appliance.label)}
                    >
                      Forget
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className={styles.stack}>
          <Card>
            <CardHeader title="Account" />
            <div className={styles.stack}>
              <TextField
                label="Display name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
              <TextField label="Email" value={settings.email} readOnly disabled />
              {nameStatus ? <Banner tone={nameStatus.tone}>{nameStatus.message}</Banner> : null}
              <div className={styles.rowEnd}>
                <Button variant="secondary" onClick={saveName}>
                  Save name
                </Button>
              </div>

              <hr className={styles.divider} />

              <div className={settingsStyles.toggleRow}>
                <div>
                  <p className={settingsStyles.toggleLabel}>Notifications</p>
                  <p className={styles.muted}>Budget, safety and device alerts.</p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onChange={updateNotifications}
                  label="Notifications"
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="ESP32 device"
              action={
                <Badge tone={HEALTH_TONE[settings.esp32HealthStatus] || 'neutral'}>
                  {formatDeviceHealthValue(settings.esp32HealthStatus, settings.esp32LastSeenAtMs)}
                </Badge>
              }
            />

            <div className={styles.stack}>
              {deviceStatus ? <Banner tone={deviceStatus.tone}>{deviceStatus.message}</Banner> : null}

              <TextField
                label="Device ID"
                value={device.deviceId}
                onChange={(event) => setDevice({ ...device, deviceId: event.target.value })}
                placeholder="wattwise-esp32-01"
              />
              <TextField
                label="Device token"
                type="password"
                value={device.deviceToken}
                onChange={(event) => setDevice({ ...device, deviceToken: event.target.value })}
                placeholder="At least 8 characters"
                hint="The same token flashed to the firmware. Changing it rotates with a 15-minute grace window."
              />

              <div className={settingsStyles.deviceMeta}>
                <span>Last command ack</span>
                <strong>{formatAckStatusValue(settings.esp32LastAckStatus)}</strong>
              </div>

              <div className={styles.rowEnd}>
                {settings.esp32Linked ? (
                  <Button variant="danger" onClick={unlinkDevice}>
                    Unlink
                  </Button>
                ) : null}
                <Button loading={savingDevice} onClick={saveDevice}>
                  {settings.esp32Linked ? 'Update link' : 'Link device'}
                </Button>
              </div>

              <p className={styles.muted}>
                Linking hardware that is currently bound to another account transfers it, verified
                server-side against the token.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
