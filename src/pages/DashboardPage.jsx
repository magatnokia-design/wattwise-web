import { useEffect, useRef, useState } from 'react';
import { useOutletControl } from '../screens/Dashboard/hooks/useOutletControl';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { buildLiveAppliances } from '../utils/liveUsage';
import { describeRelayFault } from '../constants/relayFault';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import OutletCard from '../components/dashboard/OutletCard';
import CutoffNotice from '../components/dashboard/CutoffNotice';
import { Banner, Spinner, Badge } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { outletService } from '../services/firebase';
import { auth } from '../services/firebase/config';
import styles from './page.module.css';
import { PageHero } from '../components/ui/PageHero';

// Readings kept per outlet for the live graph - about a minute at the Hub's
// 1.5 s active rate. Held in the page only, never stored.
const HISTORY_POINTS = 40;

const relativeAge = (timestampMs) => {
  if (!timestampMs) return 'never';
  const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const DashboardPage = () => {
  const {
    outlet1Status,
    outlet2Status,
    outlet1ApplianceName,
    outlet2ApplianceName,
    outlet1Metrics,
    outlet2Metrics,
    // Fresh-telemetry-AND-drawing, per outlet. The card re-derived this from
    // real power while the hook still counted `current >= 0.01 A` as a load;
    // that term is gone upstream, so the shared value is authoritative again.
    outlet1HasLoad,
    outlet2HasLoad,
    outlet1HasReading,
    outlet2HasReading,
    outlet1Suggestion,
    outlet2Suggestion,
    isLoadingOutlets,
    totalEnergyKwh,
    totalPowerW,
    estimatedCost,
    isToggling,
    toggleOutlet,
    updateApplianceName,
  } = useOutletControl();

  // Telemetry state only. useOutletControl already supplies the rate profile
  // and every priced figure on this page, so this must not read preferences a
  // second time. The outlet snapshot itself is the same query useOutletControl
  // listens to, which the Firestore SDK serves from one watch target.
  const { outlets, lastTelemetryMs } = useLiveOutlets({ withRates: false });

  /*
   * Staleness on this page is owned by useOutletControl, not useLiveOutlets.
   *
   * Both hooks now answer "are readings arriving" on their own timer — 6 s there
   * since the phone's 07f3a42, 5 s here — and two clocks answering one question
   * can disagree at the boundary. That matters in exactly one place and it is
   * not cosmetic: the card feeds `hasLoad` and `telemetryFresh` into
   * resolveOutletBadge together, so a moment where the load is judged stale and
   * the readings are not puts the badge back on "On, idle", which is the claim
   * the whole of outletBadge.js exists to prevent.
   *
   * Taking both from the same useMemo makes that unreachable rather than
   * unlikely. useLiveOutlets keeps `telemetryFresh` for Analytics and Safety,
   * which do not mount this hook, and keeps supplying `lastTelemetryMs` here —
   * a timestamp is not a claim about freshness, and its 5 s tick only keeps the
   * "12s ago" text counting up.
   */
  const telemetryFresh = outlet1HasReading || outlet2HasReading;

  // applianceIdentity carries `namedAs`, which the card needs to tell a current
  // verdict from one computed against a name the outlet has since been renamed
  // away from. useOutletControl lifts only `state` and `recognised` out of it,
  // and that file is a byte-identical copy of the phone's.
  const identityFor = (outletNumber) =>
    outlets.find((outlet) => Number(outlet.outletNumber) === outletNumber)?.applianceIdentity ||
    null;

  /*
   * A toggle the ESP32 has not polled yet. During that window the document
   * already carries the *commanded* status while the relay is still in the old
   * one — a switched-off outlet reads `status: 'off'` with `power: 52.6` beside
   * it, and both halves are true.
   *
   * Taken from the shared helper rather than derived here, so the Dashboard and
   * Analytics cannot disagree about when a command is in flight — including the
   * rule that only a real disagreement counts (told to go off while still
   * drawing, or told to come on while still drawing nothing). A command the
   * meter already agrees with has nothing left to wait for.
   *
   * Rates are deliberately not passed: useOutletControl supplies every priced
   * figure on this page, so the cost fields this also computes go unused rather
   * than reading preferences a second time.
   */
  const liveAppliances = buildLiveAppliances(outlets, {});

  /*
   * Both local corrections that used to sit here are gone, taken upstream in the
   * phone's `988f5fa` / `91a5925` and re-synced:
   *
   *   - the readings gate on this, because `liveUsage` now derives `isDrawing`
   *     as `hasReading && powerW > floor`, so a frozen power field can no longer
   *     report a transition that ended minutes ago;
   *   - the ungated commanded state, because `useOutletControl` stopped forcing
   *     `status` to false under stale telemetry (§0y.2).
   *
   * Which is the arrangement working as intended: correct it here, report it,
   * delete it when the shared file catches up. Third time now, after
   * `isDrawingPower` and the residual-current threshold.
   */
  const switchingFor = (outletNumber) => {
    const appliance = liveAppliances.find(
      (item) => Number(item.outletNumber) === outletNumber
    );
    return appliance?.isSwitching ? appliance.switchingTo : null;
  };

  // Read from the same shared file for the same reason: the phone and the
  // browser must not disagree about whether an outlet can still be switched off.
  const relayStuckFor = (outletNumber) => {
    const appliance = liveAppliances.find(
      (item) => Number(item.outletNumber) === outletNumber
    );
    return appliance?.relayStuck === true;
  };

  const [toggleError, setToggleError] = useState('');

  const handleToggle = (outletNumber) => async (nextStatus) => {
    setToggleError('');
    // useOutletControl moves the switch before awaiting, and puts it back if
    // this fails. Do not gate the UI on the result.
    const result = await toggleOutlet(outletNumber, nextStatus);
    if (!result.success) {
      setToggleError(result.error || 'Could not reach the outlet. Try again.');
    }
  };

  const handleRename = (outletNumber) => async (name, options) => {
    const result = await updateApplianceName(outletNumber, name, options);
    if (!result.success) {
      setToggleError(result.error || 'Could not save the appliance name.');
    }
    return result;
  };


  // One reading per telemetry post for each outlet's live graph.
  const [history, setHistory] = useState({ 1: [], 2: [] });
  const lastPostRef = useRef(0);
  useEffect(() => {
    if (!lastTelemetryMs || lastTelemetryMs === lastPostRef.current) return;
    lastPostRef.current = lastTelemetryMs;
    setHistory((prev) => ({
      1: [...prev[1], Number(outlet1Metrics.power) || 0].slice(-HISTORY_POINTS),
      2: [...prev[2], Number(outlet2Metrics.power) || 0].slice(-HISTORY_POINTS),
    }));
  }, [lastTelemetryMs, outlet1Metrics.power, outlet2Metrics.power]);

  // Rename / Forget, opened from the pencil beside a running appliance's name.
  const [manage, setManage] = useState(null);
  const [manageDraft, setManageDraft] = useState('');
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState('');
  const openManage = (number, name) => {
    if (!name) return;
    setManageError('');
    setManage({ number, name, mode: 'choose' });
  };
  const closeManage = () => {
    if (manageBusy) return;
    setManage(null);
  };
  const saveRename = async () => {
    const next = manageDraft.replace(/\s+/g, ' ').trim();
    if (!next || !manage) return;
    setManageBusy(true);
    const result = await updateApplianceName(manage.number, next, { source: 'user_choice' });
    setManageBusy(false);
    if (!result.success) {
      setManageError(result.error || 'The name was not saved.');
      return;
    }
    setManage(null);
  };
  const confirmForget = async () => {
    if (!manage) return;
    setManageBusy(true);
    const result = await outletService.removeApplianceProfile(auth.currentUser?.uid, manage.name);
    setManageBusy(false);
    if (!result.success) {
      setManageError(result.error || `${manage.name} was not forgotten.`);
      return;
    }
    setManage(null);
  };

  if (isLoadingOutlets) {
    return <Spinner label="Loading outlets" />;
  }

  return (
    <div className={styles.page}>
      {toggleError ? <Banner tone="alert">{toggleError}</Banner> : null}

      {/* Above the fold and above the outlet cards: this explains why one of
          them is off, so it has to be read before them, not after. */}
      {/*
        * Deliberately not dismissible, which is the one way it differs from
        * CutoffNotice below. A cutoff is an event that has finished — the outlet
        * is off, the danger passed, and dismissing it is reasonable. This is a
        * standing fault: the outlet is live, Dagitab cannot open it, and the
        * only thing that ends the condition is someone physically unplugging the
        * appliance. A banner the user can wave away would let the system go
        * quiet about the one state it cannot fix.
        */}
      {[1, 2].filter(relayStuckFor).map((outletNumber) => (
        <Banner
          key={`relay-stuck-${outletNumber}`}
          tone="danger"
          title={`Outlet ${outletNumber} is not switching off.`}
        >
          {describeRelayFault(
            outletNumber === 1 ? outlet1HasReading : outlet2HasReading
          )}
        </Banner>
      ))}

      <CutoffNotice outlets={outlets} />

      {/* Right now, in one glance (Oct 2026) - the shared stand-out top every
          page opens with. */}
      <PageHero
        tone={totalPowerW > 0.5 && telemetryFresh ? 'live' : 'neutral'}
        pulse={telemetryFresh}
        label={telemetryFresh ? 'Drawing now' : lastTelemetryMs > 0 ? `Hub offline · last heard ${relativeAge(lastTelemetryMs)}` : 'Waiting for the Hub'}
        value={totalPowerW.toFixed(1)}
        unit="W"
        stats={[
          { label: 'Today', value: `${totalEnergyKwh.toFixed(totalEnergyKwh < 1 ? 3 : 2)} kWh` },
          { label: 'Cost today', value: formatCurrency(estimatedCost) },
          { label: 'Outlets on', value: `${(outlet1Status ? 1 : 0) + (outlet2Status ? 1 : 0)} of 2` },
        ]}
      />

      {/* Both outlets side by side, above the fold. */}
      <div className={styles.pair}>
        <OutletCard
          outletNumber={1}
          isOn={outlet1Status}
          applianceName={outlet1ApplianceName}
          metrics={outlet1Metrics}
          hasLoad={outlet1HasLoad}
          suggestion={outlet1Suggestion}
          identity={identityFor(1)}
          switchingTo={switchingFor(1)}
          relayStuck={relayStuckFor(1)}
          telemetryFresh={outlet1HasReading}
          disabled={isToggling}
          onToggle={handleToggle(1)}
          onRename={handleRename(1)}
          onManageName={() => openManage(1, outlet1ApplianceName)}
          history={history[1]}
        />
        <OutletCard
          outletNumber={2}
          isOn={outlet2Status}
          applianceName={outlet2ApplianceName}
          metrics={outlet2Metrics}
          hasLoad={outlet2HasLoad}
          suggestion={outlet2Suggestion}
          identity={identityFor(2)}
          switchingTo={switchingFor(2)}
          relayStuck={relayStuckFor(2)}
          telemetryFresh={outlet2HasReading}
          disabled={isToggling}
          onToggle={handleToggle(2)}
          onRename={handleRename(2)}
          onManageName={() => openManage(2, outlet2ApplianceName)}
          history={history[2]}
        />
      </div>

      {/*
        Deliberately does not say "offline". A device is only visible here when
        it POSTS readings — `updateOutletMetrics` is the sole writer of
        `metricsUpdatedAtMs` and of `health.status: 'online'`. Polling for
        commands does not count: `getDeviceCommand` touches device health only
        to mark a timeout. So an ESP32 that is powered, on wi-fi, and polling
        normally still reads as "nothing reporting" here until it sends
        telemetry, and refreshing cannot change that — there is no newer data
        to fetch. Sending people to check power and wiring first, as this card
        used to, points them at the wrong thing.
      */}
      {!telemetryFresh ? (
        <Banner tone="warn" title="No readings from the Hub.">
          Check its power and Wi-Fi. Toggles made here are sent when it reports again.
        </Banner>
      ) : null}
      {/* Rename or forget the running appliance, as the phone's pencil does
          (Oct 2026). Forget clears the outlet's name and the saved signature,
          so Dagitab asks again the next time it runs. */}
      <Modal
        open={!!manage}
        onClose={closeManage}
        title={manage?.mode === 'forget' ? `Forget ${manage?.name}?` : manage?.mode === 'rename' ? 'Rename appliance' : manage?.name || ''}
        width={420}
        footer={manage?.mode === 'rename' ? (
          <>
            <Button variant="secondary" onClick={closeManage} disabled={manageBusy}>Cancel</Button>
            <Button onClick={saveRename} loading={manageBusy} disabled={!manageDraft.trim()}>Save</Button>
          </>
        ) : manage?.mode === 'forget' ? (
          <>
            <Button variant="secondary" onClick={closeManage} disabled={manageBusy}>Keep</Button>
            <Button variant="danger" onClick={confirmForget} loading={manageBusy}>Forget</Button>
          </>
        ) : (
          <>
            <Button variant="danger" onClick={() => setManage((m) => ({ ...m, mode: 'forget' }))}>Forget</Button>
            <Button onClick={() => { setManageDraft(manage?.name || ''); setManage((m) => ({ ...m, mode: 'rename' })); }}>Rename</Button>
          </>
        )}
      >
        <div className={styles.stack}>
          {manage?.mode === 'rename' ? (
            <TextField
              label={`Outlet ${manage?.number}'s appliance`}
              value={manageDraft}
              onChange={(event) => setManageDraft(event.target.value)}
              maxLength={40}
              autoFocus
            />
          ) : (
            <p className={styles.muted}>
              {manage?.mode === 'forget'
                ? `Outlet ${manage?.number} goes back to unnamed, and the power pattern saved as ${manage?.name} is deleted.`
                : 'Rename it, or forget it - Dagitab then asks again the next time it runs.'}
            </p>
          )}
          {manageError ? <Banner tone="alert">{manageError}</Banner> : null}
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
