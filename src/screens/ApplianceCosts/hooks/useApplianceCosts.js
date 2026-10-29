import { useEffect, useMemo, useState } from 'react';
import { historyService, outletService } from '../../../services/firebase';
import { marginalRatePerKwh } from '../../../utils/billing';
import { buildLiveTodayEntry, getManilaDateKey, withLiveToday } from '../../../utils/liveUsage';
import { aggregateApplianceUsage, averageHoursPerRunDay } from '../../../utils/applianceBreakdown';
import { useLoadOutcome } from '../../../hooks/useLoadTracker';

// Long enough to average over more than a weekend, short enough that a fan
// put away in the cool months stops counting. Same window as the phone.
const MEASURED_WINDOW_DAYS = 30;

const dateKeyDaysAgo = (todayKey, days) => {
  const date = new Date(`${todayKey}T00:00:00`);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * The web counterpart of the phone's useApplianceCosts: saved appliances, the
 * user's marginal rate, and each appliance's measured hours over the last 30
 * days. Not a copy-rule file - the phone owns its own outlet listener and
 * retry, while here `useLiveOutlets` already supplies outlets and rates.
 *
 * Both reads report through `load`, so a failed read renders as offline and
 * never as "no saved appliances".
 */
export const useApplianceCosts = ({ userId, outlets, rateProfileId, supplyRates }) => {
  const [savedAppliances, setSavedAppliances] = useState([]);
  const [windowEntries, setWindowEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);
  const load = useLoadOutcome();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const todayKey = getManilaDateKey();
        const [saved, history] = await Promise.all([
          outletService.getSavedAppliances(userId),
          historyService.getUsageByDateRange(
            userId,
            dateKeyDaysAgo(todayKey, MEASURED_WINDOW_DAYS - 1),
            todayKey
          ),
        ]);
        if (!active) return;

        const failure = [saved, history].find((result) => !result?.success);
        if (failure) {
          load.failed(failure);
          return;
        }

        setSavedAppliances(saved.data);
        setWindowEntries(history.data);
        load.succeeded();
      } catch (error) {
        console.error('Error loading appliance costs:', error);
        if (active) load.failed(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      active = false;
    };
    // `load` is left out on purpose: its callbacks are stable (useCallback).
  }, [userId, retryTick]);

  const ratePerKwh = useMemo(
    () => marginalRatePerKwh({ supplyRates, profileId: rateProfileId }),
    [supplyRates, rateProfileId]
  );

  // Keyed by lower-cased name, the same key saved appliances use.
  const measuredByName = useMemo(() => {
    const liveToday = buildLiveTodayEntry(outlets, { rateProfileId, supplyRates });
    const rows = aggregateApplianceUsage(withLiveToday(windowEntries, liveToday));
    const byName = new Map();
    rows.forEach((row) => {
      const hours = averageHoursPerRunDay(row);
      if (hours === null) return;
      byName.set(row.applianceName.toLowerCase(), { hoursPerRunDay: hours, runDays: row.runDays });
    });
    return byName;
  }, [windowEntries, outlets, rateProfileId, supplyRates]);

  return {
    loading,
    ratePerKwh,
    savedAppliances,
    measuredByName,
    measuredWindowDays: MEASURED_WINDOW_DAYS,
    showOfflineState: load.showOfflineState,
    retry: () => setRetryTick((tick) => tick + 1),
  };
};

export default useApplianceCosts;
