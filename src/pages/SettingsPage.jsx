import { useEffect, useState } from 'react';
import { useSettings } from '../screens/Settings/hooks/useSettings';
import {
  formatAckStatusValue,
  formatDeviceHealthValue,
  validateSupplyRates,
} from '../screens/Settings/utils/settingsHelpers';
import { authService } from '../services/firebase';
import { auth } from '../services/firebase/config';
import {
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
import { formatLastSeen } from '../components/settings/lastSeen';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// '2026-09' -> 'Sep 2026'
const formatRatesMonth = (key) => {
  const [y, m] = String(key || '').split('-').map(Number);
  return y && m ? `${MONTHS[m - 1]} ${y}` : '';
};

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
    switchToAutomaticRates,
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
  // The rate form is folded away: rates are automatic (Oct 2026).
  const [showRateForm, setShowRateForm] = useState(false);
  const [switchingRates, setSwitchingRates] = useState(false);
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
  const [rateErrors, setRateErrors] = useState({});
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

  /*
   * Checked before saving, which this did not do at all.
   *
   * Nothing was validated: whatever sat in the boxes went to Firestore and came
   * back green. The quiet failure is a cleared generation field -
   * normalizeSupplyRates reads blank as "use the default", so the user's own
   * P5.5034 would be replaced by the seeded P6.5269 while the page reported
   * "Rates saved". The phone has refused that since it was written; the web
   * never did.
   */
  const saveRates = async () => {
    setRateStatus(null);

    const check = validateSupplyRates(rateDraft, SUPPLY_RATE_FIELDS);
    setRateErrors(check.errors);

    if (!check.valid) {
      const first = SUPPLY_RATE_FIELDS.find((field) => check.errors[field.key]);
      setRateStatus({
        tone: 'alert',
        message: `${first.label}: ${check.errors[first.key]} Nothing was saved.`,
      });
      return;
    }

    setSavingRates(true);
    const result = await updateSupplyRates(rateDraft);
    setSavingRates(false);

    if (!result.success) {
      setRateStatus({ tone: 'alert', message: result.error || 'Could not save the rates.' });
      return;
    }

    // A saved-but-odd total is still saved, so this reports success and flags
    // the oddity rather than pretending the save failed.
    setRateStatus(
      check.warnings.length > 0
        ? { tone: 'warn', message: `Rates saved. ${check.warnings[0]}` }
        : { tone: 'good', message: 'Rates saved. Every peso figure now prices against them.' }
    );
  };


  // Clears the field's error as it is edited, so a message never outlives the
  // value that produced it.
  const setRate = (key, value) => {
    setRateDraft((draft) => ({ ...draft, [key]: value }));
    setRateErrors((errors) => {
      if (!errors[key]) return errors;
      const next = { ...errors };
      delete next[key];
      return next;
    });
  };

  const rateTotal = sumSupplyRates(rateDraft);
  const primaryField = SUPPLY_RATE_FIELDS.find((field) => field.primary);
  const advancedFields = SUPPLY_RATE_FIELDS.filter((field) => !field.primary);

  if (loading && !settings.email) {
    return <Spinner label="Loading settings" />;
  }

  const handleUseAutomatic = async () => {
    setSwitchingRates(true);
    const result = await switchToAutomaticRates();
    setSwitchingRates(false);
    setShowRateForm(false);
    setRateStatus(result.success
      ? { tone: 'good', message: 'Back on the automatic rate.' }
      : { tone: 'alert', message: result.error || 'Could not switch to the automatic rate.' });
  };

  return (
    <div className={styles.page}>
      {error ? <Banner tone="alert">{error}</Banner> : null}

      <div className={styles.split}>
        <div className={styles.stack}>
          {/* Block 1 rates — the only tariff input the user controls, and what
              every peso figure in the app is priced against. */}
          <Card>
            <CardHeader
              title="Electricity rate"
              action={settings.rateMode === 'manual'
                ? <Badge tone="neutral">Your own rate</Badge>
                : <Badge tone="good">Automatic</Badge>}
            />

            {/* Automatic since Oct 2026: Dagitab reads PELCO III's official
                generation rate every month (applyPelcoRates). The form is for
                the exception - a bill showing a different rate. */}
            <div className={settingsStyles.rateTotal}>
              <span>
                {settings.rateMode === 'manual'
                  ? 'Generation rate'
                  : `PELCO III${settings.ratesSourceMonth ? ` · ${formatRatesMonth(settings.ratesSourceMonth)}` : ''}`}
              </span>
              <strong className="ww-num">
                ₱{Number(settings.supplyRates?.generation || 0).toFixed(4)}/kWh
              </strong>
            </div>

            <div className={styles.rowEnd} style={{ marginTop: 12 }}>
              {settings.rateMode === 'manual' ? (
                <Button size="sm" variant="secondary" loading={switchingRates} onClick={handleUseAutomatic}>
                  Use the automatic rate
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => setShowRateForm((value) => !value)}>
                {showRateForm ? 'Close' : settings.rateMode === 'manual' ? 'Edit my rate' : 'Use my own rate'}
              </Button>
            </div>

            {showRateForm ? (
            <div className={styles.stack} style={{ marginTop: 16 }}>
              {primaryField ? (
                <TextField
                  label={primaryField.label}
                  type="number"
                  step="0.0001"
                  prefix="₱"
                  suffix="/kWh"
                  value={rateDraft[primaryField.key] ?? ''}
                  onChange={(event) => setRate(primaryField.key, event.target.value)}
                  error={rateErrors[primaryField.key]}
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
                      onChange={(event) => setRate(field.key, event.target.value)}
                      error={rateErrors[field.key]}
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
                {/* Named for what it does. "Reset" reads as though it wipes the
                    saved rates; it only puts the boxes back to what is already
                    stored and touches nothing in Firestore. The owner said
                    outright they would not click it, for fear of losing their
                    figures. */}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRateDraft(ratesToDraft(settings.supplyRates));
                    setRateErrors({});
                    setRateStatus(null);
                  }}
                >
                  Discard changes
                </Button>
                <Button loading={savingRates} onClick={saveRates}>
                  Save rates
                </Button>
              </div>

            </div>
            ) : null}
            {!showRateForm && rateStatus ? <Banner tone={rateStatus.tone}>{rateStatus.message}</Banner> : null}
          </Card>


          <Card>
            <CardHeader
              title="Saved appliances"
            />
            {savedAppliances.length === 0 ? (
              <EmptyState icon="pricetags-outline" title="No saved appliances yet" />
            ) : (
              <ul className={settingsStyles.applianceList}>
                {savedAppliances.map((appliance) => (
                  <li key={appliance.label} className={settingsStyles.appliance}>
                    <div>
                      <p className={settingsStyles.applianceName}>{appliance.label}</p>
                      <p className={styles.muted}>
                        {formatLastSeen(appliance.lastSeen)} · <span className="ww-num">~{appliance.meanPower.toFixed(0)} W</span>
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
              ends — what Dagitab knows already, and what it has learned here. */}
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
              title="Dagitab Hub"
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

              {!settings.esp32Linked ? (
                <p className={styles.muted}>Pair it in the Dagitab app.</p>
              ) : null}
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
            Dagitab will ask for its name again the next time it runs.
          </p>


        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
