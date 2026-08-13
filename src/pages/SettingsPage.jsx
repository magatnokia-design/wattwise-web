import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../screens/Settings/hooks/useSettings';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
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
 * Whether to offer a name is the backend's call now.
 *
 * Both clients used to re-derive it from the raw fields and only one got it
 * right, so this page went on offering "Accept: LED Lamp" for an outlet already
 * named LED Lamp — the owner had accepted it on the phone and the site kept
 * asking. Clearing the detection fields on accept would not have helped either;
 * the detector re-evaluates every two samples and writes the same suggestion
 * back within a second.
 *
 * `suggestionPending` settles it in one place. The label comparison stays as the
 * fallback for outlet documents written before that field shipped.
 */
const shouldOfferSuggestion = (outlet, suggestedName, currentName) => {
  const pending = outlet?.applianceIdentity?.suggestionPending;
  if (typeof pending === 'boolean') return pending;

  const normalise = (value) => String(value || '').trim().toLowerCase();
  return !!suggestedName && normalise(suggestedName) !== normalise(currentName);
};

export const SettingsPage = () => {
  // withRates: false — this page needs applianceIdentity, not billing figures,
  // and the rates read is a second Firestore round trip for nothing.
  const { outlets } = useLiveOutlets({ withRates: false });
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
    updateOutletName,
    clearOutletDetection,
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

  // { label, outletNumber } — outletNumber only when renaming from an outlet row.
  const openRename = (label, outletNumber = null) => {
    setRenameTarget({ label, outletNumber });
    setRenameDraft(label);
    setRenameError('');
  };

  const hasSignature = (label) => {
    const wanted = String(label || '').trim().toLowerCase();
    return savedAppliances.some((appliance) => appliance.label.toLowerCase() === wanted);
  };

  const submitRename = async () => {
    const next = renameDraft.trim();
    const { label, outletNumber } = renameTarget;

    if (!next) {
      setRenameError('Give the appliance a name.');
      return;
    }

    // A capitalisation-only fix is a legitimate rename and the backend allows
    // it, so only an exact match is a no-op worth short-circuiting.
    if (next === label) {
      setRenameTarget(null);
      return;
    }

    setRenaming(true);

    /*
     * Two routes, and which one applies depends on whether a signature was ever
     * learned for this name.
     *
     * An outlet named while its appliance was not drawing gets the name but no
     * signature — registerApplianceProfile returns learned: false. That name
     * never reaches Saved appliances, so renameApplianceProfile would answer
     * not-found, and with free-text naming gone the outlet would be stuck with
     * a name nothing on the page could change. That is the dead end this
     * avoids.
     *
     * Where a signature does exist the callable is the only correct route: it
     * renames the signature and the outlet together, and matchNamedAppliance
     * resolves an outlet's name against the saved profiles, so splitting them
     * would silently break identity matching on that outlet.
     */
    const result = hasSignature(label)
      ? await renameSavedAppliance(label, next)
      : await updateOutletName(outletNumber, next, { source: 'manual' });

    setRenaming(false);

    if (!result.success) {
      // not-found / already-exists / invalid-argument all arrive here with
      // user-safe messages from the callable.
      setRenameError(result.error || 'Could not rename this appliance.');
      return;
    }

    if (outletNumber) refresh();

    setRenameTarget(null);
  };

  const [name, setName] = useState('');
  const [nameStatus, setNameStatus] = useState(null);

  const [rateDraft, setRateDraft] = useState(() => ratesToDraft(null));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rateStatus, setRateStatus] = useState(null);
  const [savingRates, setSavingRates] = useState(false);

  const [outletStatus, setOutletStatus] = useState(null);

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

  // Accepting a detection is the only way an outlet gets a name now, so it is
  // also the only thing that reports on the result.
  const acceptDetection = async (outletNumber, suggested, confidence) => {
    setOutletStatus(null);
    const result = await updateOutletName(outletNumber, suggested, {
      source: 'auto_suggestion',
      confidencePercent: confidence,
    });

    setOutletStatus(
      result.success
        ? { tone: 'good', message: `Outlet ${outletNumber} is now ${suggested}.` }
        : { tone: 'alert', message: result.error || 'Could not apply the detection.' }
    );

    if (result.success) refresh();
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
            {/* Free-text outlet naming was removed at the owner's request. An
                outlet is named by accepting what the detector measured, and
                relabelled afterwards under Saved appliances — which renames the
                signature and the outlet together. Accepting still runs through
                registerApplianceProfile, so the signature is learned exactly as
                typing a name used to do. */}
            <CardHeader
              title="Outlets"
              subtitle="An outlet takes its name from what WattWise detects. Accept a detection and its power signature is learned at the same time."
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

                const outlet = outlets.find(
                  (candidate) => Number(candidate.outletNumber) === outletNumber
                );
                // The raw field, not settings.outletNName — that one defaults to
                // "Outlet 1", which would read as a user-given name and make the
                // fallback comparison compare a suggestion against a placeholder.
                const currentName = String(outlet?.applianceName || '').trim();
                const offerSuggestion = shouldOfferSuggestion(outlet, suggested, currentName);
                const identityChanged =
                  outlet?.applianceIdentity?.state === 'changed' && !!currentName;

                return (
                  <div key={outletNumber} className={settingsStyles.outletBlock}>
                    <div className={settingsStyles.outletHead}>
                      <p className={settingsStyles.outletLabel}>Outlet {outletNumber}</p>
                      <p className={settingsStyles.outletName}>
                        {currentName || <span className={styles.muted}>Not named yet</span>}
                      </p>
                      {/* Renaming an outlet that already has a name is not the
                          free-text naming that was removed — the name still has
                          to arrive from a detection first. This is the relabel
                          half of the owner's rule, and without it an outlet
                          named before a signature was learned could never be
                          corrected. */}
                      {currentName ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openRename(currentName, outletNumber)}
                        >
                          Rename
                        </Button>
                      ) : null}
                    </div>

                    {identityChanged ? (
                      <p className={settingsStyles.identityNote}>
                        The readings on this outlet no longer match{' '}
                        <strong>{currentName}</strong>.
                      </p>
                    ) : null}

                    {offerSuggestion && suggested ? (
                      <div className={settingsStyles.suggestionRow}>
                        <span>
                          Detected as <strong>{suggested}</strong>
                          {confidence != null ? ` (${confidence}%)` : ''}
                        </span>
                        <div className={styles.row}>
                          <Button
                            size="sm"
                            onClick={() => acceptDetection(outletNumber, suggested, confidence)}
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
                        onClick={() => removeSavedAppliance(appliance.label)}
                      >
                        Forget
                      </Button>
                    </div>
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
            {hasSignature(renameTarget?.label)
              ? `The learned signature keeps its measurements — only the label changes. Any outlet currently named ${renameTarget?.label} is renamed with it, so WattWise can still recognise this appliance.`
              : `Nothing has been learned for ${renameTarget?.label} yet — this only changes the outlet's label. Run the appliance and accept the detection to teach WattWise its signature.`}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
