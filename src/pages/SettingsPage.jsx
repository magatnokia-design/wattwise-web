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
import SupportedAppliances from '../components/settings/SupportedAppliances';
import SecurityActivityCard from '../components/settings/SecurityActivityCard';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
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

/*
 * The Outlets card is gone entirely, at the owner's request.
 *
 * Detections are offered on the Dashboard, beside the live readings that
 * produced them, which is the only place they can be judged. Repeating the same
 * prompt here meant two screens deciding independently whether to show it — and
 * they disagreed, so the site kept offering a name the phone had already
 * accepted.
 *
 * Learned appliances below is now the single place a name is edited. Renaming a
 * signature renames the outlet wearing it, so nothing is lost by dropping the
 * outlet rows.
 */
export const SettingsPage = () => {
  const { user } = useAuth();
  const {
    settings,
    savedAppliances,
    loading,
    error,
    fetchSettings,
    updateSupplyRates,
    updateNotifications,
    // updateDeviceSettings / clearDeviceSettings are deliberately not pulled in.
    // Pairing is the phone app's job — see the ESP32 card below.
    removeSavedAppliance,
    renameSavedAppliance,
  } = useSettings();

  /*
   * Rename goes through the callable, never a direct write to applianceProfiles.
   *
   * It renames the signature *and* any outlet wearing the old label, in that
   * order, because matchNamedAppliance resolves an outlet's name against the
   * saved profiles. A signature renamed on its own would leave the outlet
   * pointing at a label that no longer exists, every run would come back
   * `unknown`, and applianceIdentity would stop working on that outlet without
   * saying so.
   */
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  // The signature being forgotten, held while the confirmation is up. Forget
  // used to fire straight from the button: three saved appliances became two
  // with nothing asked and no way back. What it deletes is a measured run, so
  // recovering means plugging the appliance in and teaching it again - and the
  // button sits directly beside Rename, which exists precisely so that
  // correcting a name does not cost the measurements.
  const [forgetTarget, setForgetTarget] = useState(null);
  const [forgetting, setForgetting] = useState(false);
  const [forgetError, setForgetError] = useState('');

  const closeForget = () => {
    setForgetTarget(null);
    setForgetError('');
  };

  const confirmForget = async () => {
    if (!forgetTarget) return;

    setForgetError('');
    setForgetting(true);
    const result = await removeSavedAppliance(forgetTarget);
    setForgetting(false);

    if (!result?.success) {
      setForgetError(result?.error || 'Could not forget this appliance. Try again.');
      return;
    }

    setForgetTarget(null);
  };

  const openRename = (label) => {
    setRenameTarget(label);
    setRenameDraft(label);
    setRenameError('');
  };

  const submitRename = async () => {
    const next = renameDraft.trim();

    if (!next) {
      setRenameError('Give the appliance a name.');
      return;
    }

    // A capitalisation-only fix is a legitimate rename and the backend allows
    // it, so only an exact match is a no-op worth short-circuiting.
    if (next === renameTarget) {
      setRenameTarget(null);
      return;
    }

    setRenaming(true);
    const result = await renameSavedAppliance(renameTarget, next);
    setRenaming(false);

    if (!result.success) {
      // not-found / already-exists / invalid-argument all arrive here with
      // user-safe messages from the callable.
      setRenameError(result.error || 'Could not rename this appliance.');
      return;
    }

    setRenameTarget(null);
  };

  const [name, setName] = useState('');
  const [nameStatus, setNameStatus] = useState(null);

  const [rateDraft, setRateDraft] = useState(() => ratesToDraft(null));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rateStatus, setRateStatus] = useState(null);
  const [savingRates, setSavingRates] = useState(false);


  useEffect(() => {
    setName(settings.profileName === 'User' ? '' : settings.profileName);
    setRateDraft(ratesToDraft(settings.supplyRates));
  }, [settings.profileName, settings.supplyRates]);

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

              {/* Asked often enough to be worth a link from the page that
                  raises the question, rather than only from the sidebar. */}
              <p className={styles.muted}>
                Not sure which lines to fill in, or how close this will be to the
                bill that arrives? <Link to="/help">Help Center</Link> answers
                both. See also <Link to="/about">About</Link>,{' '}
                <Link to="/privacy">Privacy</Link> and{' '}
                <Link to="/terms">Terms</Link>.
              </p>
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
                    <div className={styles.row}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openRename(appliance.label)}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setForgetTarget(appliance.label)}
                      >
                        Forget
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Directly under Learned appliances: that card is what this one ends
              by pointing at, and the two answer the same question from opposite
              ends — what WattWise knows already, and what it has learned here. */}
          <SupportedAppliances />
        </div>

        <div className={styles.stack}>
          {/* Above Account, not below: this is the card someone goes looking
              for after something worrying, and it should already be in view. */}
          <SecurityActivityCard userId={user?.uid} />

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

            {/*
              Read-only by design. Pairing lives in the phone app, which owns the
              QR scanner and flashes the token to the firmware. A token typed
              here has no such check: one wrong character silently unbinds a
              working device, with a 15-minute grace window as the only warning
              anyone gets. There is exactly one ESP32 on this account, so the
              upside of editing it here is nil against that downside.
            */}
            <div className={styles.stack}>
              <div className={settingsStyles.deviceMeta}>
                <span>Device ID</span>
                <strong>{settings.esp32DeviceId || 'Not paired'}</strong>
              </div>

              <div className={settingsStyles.deviceMeta}>
                <span>Last command ack</span>
                <strong>{formatAckStatusValue(settings.esp32LastAckStatus)}</strong>
              </div>

              <p className={styles.muted}>
                {settings.esp32Linked
                  ? 'Paired. To re-pair or move this device to another account, use the phone app — it scans the QR code and checks the token against the firmware.'
                  : 'No device paired yet. Pair it in the phone app, which scans the QR code on the ESP32. It will appear here once it reports.'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={!!renameTarget}
        onClose={() => (renaming ? null : setRenameTarget(null))}
        title="Rename appliance"
        width={440}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRenameTarget(null)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button loading={renaming} onClick={submitRename}>
              Rename
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {renameError ? <Banner tone="alert">{renameError}</Banner> : null}

          <TextField
            label="Name"
            value={renameDraft}
            onChange={(event) => {
              setRenameDraft(event.target.value);
              setRenameError((current) => (current ? '' : current));
            }}
          />

          <p className={styles.muted}>
            The signature keeps its measurements — only the label changes. Any
            outlet currently named <strong>{renameTarget}</strong> is renamed
            with it, so WattWise still recognises this appliance afterwards.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!forgetTarget}
        onClose={() => (forgetting ? null : closeForget())}
        title="Forget this appliance?"
        width={420}
        footer={
          <>
            <Button variant="secondary" onClick={closeForget} disabled={forgetting}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmForget} loading={forgetting}>
              Forget it
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          {forgetError ? <Banner tone="alert">{forgetError}</Banner> : null}

          <p className={styles.muted}>
            <strong>{forgetTarget}</strong> and the power measurements behind it
            are deleted. Detection falls back to the built-in profiles, so this
            appliance is recognised by its general shape rather than by how yours
            actually draws.
          </p>

          <p className={styles.muted}>
            There is no undo. Getting it back means plugging the appliance in and
            letting WattWise measure a full run again. If you only want to change
            the name, close this and use <strong>Rename</strong> — that keeps the
            measurements.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
