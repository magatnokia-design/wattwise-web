import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletControl } from '../screens/Dashboard/hooks/useOutletControl';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { buildLiveAppliances } from '../utils/liveUsage';
import { useDismissibleNotice } from '../hooks/useDismissibleNotice';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import OutletCard from '../components/dashboard/OutletCard';
import CutoffNotice from '../components/dashboard/CutoffNotice';
import { StatGrid, StatTile } from '../components/ui/StatTile';
import { Banner, Spinner, Badge } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import styles from './page.module.css';

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
    estimatedCostPerHour,
    effectiveRate,
    hasSupplyRates,
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

  const rateNotice = useDismissibleNotice('rate-notice');
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

  if (isLoadingOutlets) {
    return <Spinner label="Loading outlets" />;
  }

  return (
    <div className={styles.page}>
      {!hasSupplyRates && rateNotice.visible ? (
        <Banner
          tone="warn"
          title="Using default PELCO III rates."
          action={
            <Button size="sm" variant="secondary" onClick={rateNotice.dismiss}>
              Dismiss
            </Button>
          }
        >
          Every peso figure below is an estimate until you enter your own
          generation and transmission rates. <Link to="/settings">Set them in Settings →</Link>
        </Banner>
      ) : null}

      {toggleError ? <Banner tone="alert">{toggleError}</Banner> : null}

      {/* Above the fold and above the outlet cards: this explains why one of
          them is off, so it has to be read before them, not after. */}
      {/*
        * Deliberately not dismissible, which is the one way it differs from
        * CutoffNotice below. A cutoff is an event that has finished — the outlet
        * is off, the danger passed, and dismissing it is reasonable. This is a
        * standing fault: the outlet is live, WattWise cannot open it, and the
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
          It was told to switch off and current is still flowing through it. The
          relay may be stuck closed, so the safety cut-off cannot protect this
          outlet either. Unplug the appliance at the wall and have the wiring
          checked before using it again.
        </Banner>
      ))}

      <CutoffNotice outlets={outlets} />

      <div className={styles.pageIntro}>
        <p className={styles.lede}>
          Live readings from your ESP32. Both outlets update without refreshing, and a toggle here
          switches the physical relay.
        </p>
        <Badge tone={telemetryFresh ? 'good' : 'neutral'}>
          {telemetryFresh
            ? `Hardware reporting · ${relativeAge(lastTelemetryMs)}`
            : lastTelemetryMs > 0
              ? `No telemetry · last seen ${relativeAge(lastTelemetryMs)}`
              : 'No telemetry yet'}
        </Badge>
      </div>

      <StatGrid>
        <StatTile
          label="Drawing now"
          value={totalPowerW.toFixed(1)}
          unit="W"
          tone="primary"
          icon="⚡"
          caption="Both outlets combined"
        />
        <StatTile
          label="Energy today"
          value={totalEnergyKwh.toFixed(3)}
          unit="kWh"
          icon="🔋"
          caption="Since midnight, Manila time"
        />
        <StatTile
          label="Cost today"
          value={formatCurrency(estimatedCost)}
          icon="💰"
          /* The marginal rate now, not total/kWh — useOutletControl returns it
             under the same name. Calling it "effective" here was the caption
             that read P5610.00/kWh beside a 16 W lamp. */
          caption={`PELCO III · ${formatCurrency(effectiveRate)} per additional kWh`}
        />
        <StatTile
          label="Running cost"
          value={formatCurrency(estimatedCostPerHour)}
          unit="/hr"
          icon="⏱️"
          caption="At the current draw"
        />
      </StatGrid>

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
        <Card>
          <p style={{ fontSize: 13, color: 'var(--ww-text-light)' }}>
            <strong style={{ color: 'var(--ww-text-dark)' }}>Nothing is reporting.</strong> No
            readings have arrived in the last 12 seconds, so everything above stays at zero.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ww-text-light)', marginTop: 10 }}>
            This does not necessarily mean the ESP32 is offline. WattWise only sees it when it
            sends a reading — checking for commands is silent. <strong
              style={{ color: 'var(--ww-text-dark)' }}
            >Toggling either outlet usually wakes it up.</strong> Refreshing this page will not:
            there is no newer reading to fetch.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ww-text-light)', marginTop: 10 }}>
            If it stays quiet after a toggle, then check it is powered and still linked under{' '}
            <Link to="/settings">Settings</Link>. Either way, toggles queued here are picked up as
            soon as it reports again.
          </p>
        </Card>
      ) : null}
    </div>
  );
};

export default DashboardPage;
