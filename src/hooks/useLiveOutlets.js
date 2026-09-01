import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { outletService, userService } from '../services/firebase';
import { auth } from '../services/firebase/config';

// Same window the phone app's Dashboard and Analytics screens use, so both
// clients agree on whether the hardware is currently reporting.
const HARDWARE_STALE_THRESHOLD_MS = 12000;

const toEpochMs = (value) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * When the hardware last posted telemetry — and only telemetry.
 *
 * Same field precedence the phone app's `deriveOutletRuntimeState` uses, minus
 * its `lastUpdated` last resort. `lastUpdated` is also written by
 * `ensureOutletsExist` when the documents are created and by
 * `processOutletToggle` on every switch, so falling back to it reports
 * "hardware reporting · just now" for an account whose ESP32 has never posted
 * anything. `metricsUpdatedAtMs` and its siblings are written by
 * `updateOutletMetrics` alone. No telemetry field means not reporting.
 */
const getTelemetryUpdatedAtMs = (outlet = {}) => {
  const explicitMs = toEpochMs(
    outlet?.metricsUpdatedAtMs || outlet?.lastMetricsAtMs || outlet?.lastTelemetryAtMs
  );
  if (explicitMs > 0) return explicitMs;

  return toEpochMs(outlet?.metricsUpdatedAt || outlet?.lastMetricsAt || outlet?.lastTelemetryAt);
};

/**
 * Live outlet documents plus the billing preferences every peso figure needs.
 *
 * Mirrors the subscription AnalyticsScreen sets up in the phone app: telemetry
 * arrives roughly once a second, so pages that price it recompute locally
 * rather than re-querying Firestore on every reading.
 *
 * `telemetryFresh` is re-evaluated on a timer as well as on each snapshot —
 * a device that stops posting sends no snapshot to say so, and without the
 * timer the UI would sit on a stale "online" forever.
 *
 * `withRates: false` skips the `getUserPreferences` read for callers that only
 * want the telemetry state. The Dashboard is one: it already has the rate
 * profile from `useOutletControl`, and fetching it twice per mount is a second
 * billed document read for a figure it already has.
 */
export const useLiveOutlets = ({ withRates = true } = {}) => {
  const [outlets, setOutlets] = useState([]);
  const [rateProfileId, setRateProfileId] = useState(null);
  const [supplyRates, setSupplyRates] = useState(null);
  const [hasSupplyRates, setHasSupplyRates] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let unsubscribeOutlets = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeOutlets) {
        unsubscribeOutlets();
        unsubscribeOutlets = null;
      }

      if (!user?.uid) {
        setOutlets([]);
        setRateProfileId(null);
        setSupplyRates(null);
        setLoading(false);
        return;
      }

      if (withRates) {
        userService
          .getUserPreferences(user.uid)
          .then((result) => {
            if (!result?.success) return;
            setRateProfileId(result.data?.rateProfileId || null);
            setSupplyRates(result.data?.supplyRates || null);
            setHasSupplyRates(result.data?.hasSupplyRates !== false);
          })
          .catch((error) => console.warn('Could not load rate profile:', error?.message));
      }

      unsubscribeOutlets = outletService.subscribeToOutlets(
        user.uid,
        (nextOutlets) => {
          setOutlets(nextOutlets);
          setLoading(false);
        },
        (error) => {
          console.error('Outlet subscription error:', error);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeOutlets) unsubscribeOutlets();
      unsubscribeAuth();
    };
  }, [withRates]);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const lastTelemetryMs = outlets.reduce(
    (latest, outlet) => Math.max(latest, getTelemetryUpdatedAtMs(outlet)),
    0
  );

  // `tick` is read so this recomputes on the timer, not only on snapshots.
  void tick;
  const telemetryFresh =
    lastTelemetryMs > 0 && Date.now() - lastTelemetryMs <= HARDWARE_STALE_THRESHOLD_MS;

  return {
    outlets,
    rateProfileId,
    supplyRates,
    hasSupplyRates,
    lastTelemetryMs,
    telemetryFresh,
    loading,
  };
};

export default useLiveOutlets;
