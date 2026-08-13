import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletControl } from '../screens/Dashboard/hooks/useOutletControl';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { useDismissibleNotice } from '../hooks/useDismissibleNotice';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import OutletCard from '../components/dashboard/OutletCard';
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
    outlet1Suggestion,
    outlet2Suggestion,
    outlet1HasLoad,
    outlet2HasLoad,
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
  const { outlets, telemetryFresh, lastTelemetryMs } = useLiveOutlets({ withRates: false });

  // applianceIdentity carries `namedAs`, which the card needs to tell a current
  // verdict from one computed against a name the outlet has since been renamed
  // away from. useOutletControl lifts only `state` and `recognised` out of it,
  // and that file is a byte-identical copy of the phone's.
  const identityFor = (outletNumber) =>
    outlets.find((outlet) => Number(outlet.outletNumber) === outletNumber)?.applianceIdentity ||
    null;
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
          caption={`PELCO III · ${formatCurrency(effectiveRate)}/kWh for extra use`}
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
          suggestion={outlet1Suggestion}
          identity={identityFor(1)}
          hasLoad={outlet1HasLoad}
          disabled={isToggling}
          onToggle={handleToggle(1)}
          onRename={handleRename(1)}
        />
        <OutletCard
          outletNumber={2}
          isOn={outlet2Status}
          applianceName={outlet2ApplianceName}
          metrics={outlet2Metrics}
          suggestion={outlet2Suggestion}
          identity={identityFor(2)}
          hasLoad={outlet2HasLoad}
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
