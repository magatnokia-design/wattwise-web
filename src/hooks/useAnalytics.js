import { useEffect, useMemo, useState } from 'react';
import { budgetService, historyService } from '../services/firebase';
import { useAuth } from './useAuth';
import { calculatePelcoIIIBill, marginalRatePerKwh } from '../utils/billing';
import { buildLiveAppliances, buildLiveTodayEntry, withLiveToday } from '../utils/liveUsage';

/**
 * Analytics for the selected period.
 *
 * The arithmetic here is lifted from the phone app's AnalyticsScreen so both
 * clients report the same totals: same tab ranges, same live-today splice, same
 * single call to calculatePelcoIIIBill over the period's kWh. What is new is
 * the per-day, per-outlet series — the phone app charts one bar per day because
 * React Native has no charting primitive; here that constraint is gone.
 */

export const ANALYTICS_TABS = ['Daily', 'Weekly', 'Monthly'];

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const buildDateRange = (startDate, endDate) => {
  const days = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

// Shared by the fetch effect and the compute memo so the queried window and the
// charted window can never drift apart.
const getTabRange = (tab) => {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate =
    tab === 'Weekly' ? addDays(endDate, -6) : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  return { startDate, endDate };
};

const formatShortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatWeekday = (date) => date.toLocaleDateString('en-US', { weekday: 'short' });

// `peakHour` is absent on a live today entry and on any day whose rollup logged
// no readings. Number(null) is 0 and 0 is finite, so the absence has to be
// caught before the numeric check or "no peak hour" renders as midnight.
const formatPeakHour = (hourValue) => {
  if (hourValue === null || hourValue === undefined || hourValue === '') return 'N/A';

  const hour = Number(hourValue);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'N/A';

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${period}`;
};

/**
 * Rolls the per-day applianceBreakdown written by processDailyRollup into one
 * list for the selected range, largest consumer first.
 */
const aggregateApplianceUsage = (entries) => {
  const totals = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const breakdown = Array.isArray(entry?.applianceBreakdown) ? entry.applianceBreakdown : [];

    breakdown.forEach((item) => {
      const name = String(item?.applianceName || '').trim();
      const energyKwh = toNumber(item?.energyKwh);
      if (!name || energyKwh <= 0) return;

      const existing = totals.get(name) || { applianceName: name, energyKwh: 0, cost: 0 };
      existing.energyKwh += energyKwh;
      existing.cost += toNumber(item?.cost);
      totals.set(name, existing);
    });
  });

  return Array.from(totals.values()).sort((a, b) => b.energyKwh - a.energyKwh);
};

export const useAnalytics = ({ tab, outlets, rateProfileId, supplyRates }) => {
  const { user, loading: authLoading } = useAuth();
  const [rangeEntries, setRangeEntries] = useState([]);
  const [fallbackDaily, setFallbackDaily] = useState(null);
  const [budget, setBudget] = useState({ monthlyBudget: 0, currentSpending: 0 });
  const [loading, setLoading] = useState(false);

  const liveTodayEntry = useMemo(
    () => buildLiveTodayEntry(outlets, { rateProfileId, supplyRates }),
    [outlets, rateProfileId, supplyRates]
  );

  const liveAppliances = useMemo(
    () => buildLiveAppliances(outlets, { rateProfileId, supplyRates }),
    [outlets, rateProfileId, supplyRates]
  );

  useEffect(() => {
    if (!user?.uid) {
      setBudget({ monthlyBudget: 0, currentSpending: 0 });
      return undefined;
    }

    let active = true;

    budgetService.getCurrentMonthBudget(user.uid).then((result) => {
      if (!active || !result.success) return;
      setBudget({
        monthlyBudget: toNumber(result.data.monthlyBudget),
        currentSpending: toNumber(result.data.currentSpending),
      });
    });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Fetch only. Kept off the live telemetry path on purpose: recomputing is
  // cheap, but re-querying Firestore on every sensor reading is not.
  useEffect(() => {
    if (authLoading) return undefined;

    if (!user?.uid) {
      setRangeEntries([]);
      setFallbackDaily(null);
      return undefined;
    }

    let active = true;

    const fetchAnalytics = async () => {
      setLoading(true);

      try {
        if (tab === 'Daily') {
          // Only needed as a fallback for when nothing has been measured today.
          const dailyResult = await historyService.getDailyUsage(user.uid, {}, null, 1);
          if (!active) return;

          setFallbackDaily(dailyResult.success && dailyResult.data.length ? dailyResult.data[0] : null);
          setRangeEntries([]);
          return;
        }

        const { startDate, endDate } = getTabRange(tab);
        const rangeResult = await historyService.getUsageByDateRange(
          user.uid,
          toDateKey(startDate),
          toDateKey(endDate)
        );
        if (!active) return;

        setRangeEntries(rangeResult.success ? rangeResult.data : []);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, [authLoading, tab, user?.uid]);

  const analytics = useMemo(() => {
    if (tab === 'Daily') {
      // Today first. Only when nothing has been measured yet does this fall
      // back to the last rolled-up day.
      const dailyEntry = liveTodayEntry || fallbackDaily;

      const totalEnergy = toNumber(dailyEntry?.totalEnergy);
      const outlet1Total = toNumber(dailyEntry?.outlet1Energy);
      const outlet2Total = toNumber(dailyEntry?.outlet2Energy);
      const entryDate = dailyEntry?.date ? new Date(`${dailyEntry.date}T00:00:00`) : new Date();

      // A day is not a billing period, so the once-a-month P5.00 metering charge
      // has no business in today's cost - with it, a day on which almost nothing
      // ran was priced at P5.61 for 0.001 kWh. Marginal, matching
      // processDailyRollup and the live History row.
      const bill = calculatePelcoIIIBill(totalEnergy, {
        date: entryDate,
        supplyRates,
        profileId: rateProfileId || null,
        daysInPeriod: dailyEntry ? 1 : 0,
        billingDays: getDaysInMonth(entryDate),
        includePeriodFlats: false,
      });

      const outlet1Name = String(dailyEntry?.outlet1Name || '').trim() || 'Outlet 1';
      const outlet2Name = String(dailyEntry?.outlet2Name || '').trim() || 'Outlet 2';

      return {
        isLive: !!liveTodayEntry,
        summary: {
          totalEnergy,
          totalCost: bill.totals.total,
          averageUsage: totalEnergy,
          peakUsage: totalEnergy,
          // Watts, not kWh: the day's highest measured draw, tracked per sample
          // by updateOutletMetrics and rolled over on the same boundary as
          // energyDateKey.
          //
          // The live entry also carries `currentPower`, the instantaneous max
          // across both outlets. Nothing here reads it: Analytics reports the
          // peak and only the peak, and the Dashboard gets live draw from
          // useOutletControl. Surfacing it as well would be a second field with
          // no consumer.
          peakPowerW: toNumber(dailyEntry?.peakPower),
          peakHour: formatPeakHour(dailyEntry?.peakHour),
          busiestDay: dailyEntry?.date ? formatShortDate(entryDate) : 'N/A',
          outlet1Total,
          outlet2Total,
          effectiveRate: bill.effectiveRate,
          marginalRate: marginalRatePerKwh({ supplyRates, profileId: rateProfileId || null }),
          applianceUsage: aggregateApplianceUsage(dailyEntry ? [dailyEntry] : []),
          outlet1Name,
          outlet2Name,
        },
        // One point: today, split by outlet. The chart reads the same shape for
        // every tab so the component does not branch.
        series: dailyEntry
          ? [
              {
                key: dailyEntry.date,
                // Only actually today when the live entry is what got charted;
                // the fallback is the last rolled-up day, which can be older.
                label: liveTodayEntry ? 'Today' : formatShortDate(entryDate),
                outlet1: outlet1Total,
                outlet2: outlet2Total,
                total: totalEnergy,
              },
            ]
          : [],
        billDetails: bill,
      };
    }

    const { startDate, endDate } = getTabRange(tab);

    // Today has no rolled-up document until midnight, so splice in the live
    // figure — otherwise the current day always charted as zero.
    const entries = withLiveToday(rangeEntries, liveTodayEntry);
    const entriesByDate = new Map();
    entries.forEach((entry) => entriesByDate.set(entry.date, entry));

    const days = buildDateRange(startDate, endDate);
    const dailyValues = days.map((day) => toNumber(entriesByDate.get(toDateKey(day))?.totalEnergy));

    const totalEnergy = dailyValues.reduce((sum, value) => sum + value, 0);
    const outlet1Total = days.reduce(
      (sum, day) => sum + toNumber(entriesByDate.get(toDateKey(day))?.outlet1Energy),
      0
    );
    const outlet2Total = days.reduce(
      (sum, day) => sum + toNumber(entriesByDate.get(toDateKey(day))?.outlet2Energy),
      0
    );

    const peakUsage = dailyValues.length ? Math.max(...dailyValues) : 0;
    // The day that used the most — the same day `peakUsage` measures, so the
    // tile and its caption describe one another.
    const busiestDayData = dailyValues
      .map((value, index) => ({ value, date: days[index] }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)[0];

    // One rate, applied once, over the whole period's kWh — never per-day and
    // summed. PELCO III averages monthly and applies uniformly.
    //
    // The period flats belong to Monthly and only Monthly. "The last 7 days" is
    // not a billing period, so charging it a full month's metering fee overstates
    // a week by the whole P5.60 — the same error, one scale up, that made a day
    // cost P5.61.
    const bill = calculatePelcoIIIBill(totalEnergy, {
      date: endDate,
      supplyRates,
      profileId: rateProfileId || null,
      daysInPeriod: entries.length > 0 ? days.length : 0,
      billingDays: getDaysInMonth(endDate),
      includePeriodFlats: tab === 'Monthly',
    });

    const latestEntry = entries[entries.length - 1];
    const outlet1Name = String(latestEntry?.outlet1Name || '').trim() || 'Outlet 1';
    const outlet2Name = String(latestEntry?.outlet2Name || '').trim() || 'Outlet 2';

    const series = days.map((day) => {
      const key = toDateKey(day);
      const entry = entriesByDate.get(key);

      return {
        key,
        label: tab === 'Weekly' ? formatWeekday(day) : String(day.getDate()),
        fullLabel: formatShortDate(day),
        outlet1: toNumber(entry?.outlet1Energy),
        outlet2: toNumber(entry?.outlet2Energy),
        total: toNumber(entry?.totalEnergy),
        isLive: entry?.isLive === true,
      };
    });

    return {
      isLive: !!liveTodayEntry,
      summary: {
        totalEnergy,
        totalCost: bill.totals.total,
        averageUsage: days.length ? totalEnergy / days.length : 0,
        peakUsage,
        // Highest daily peak in the period — a real high now that the backend
        // tracks one, where before it was the highest instantaneous sample that
        // happened to be live when each day rolled up.
        peakPowerW: entries.reduce((highest, entry) => Math.max(highest, toNumber(entry?.peakPower)), 0),
        peakHour: 'N/A',
        busiestDay: busiestDayData ? formatShortDate(busiestDayData.date) : 'N/A',
        outlet1Total,
        outlet2Total,
        effectiveRate: bill.effectiveRate,
        marginalRate: marginalRatePerKwh({ supplyRates, profileId: rateProfileId || null }),
        applianceUsage: aggregateApplianceUsage(entries),
        outlet1Name,
        outlet2Name,
      },
      series,
      billDetails: bill,
    };
  }, [tab, rangeEntries, fallbackDaily, liveTodayEntry, rateProfileId, supplyRates]);

  return { ...analytics, liveAppliances, budget, loading };
};

export default useAnalytics;
