import { useEffect, useState } from 'react';
import { historyService } from '../services/firebase';
import { useAuth } from './useAuth';
import { getManilaDateKey } from '../utils/liveUsage';
import { previousWindow, sumKwh } from '../utils/analyticsInsights';

/**
 * kWh used in the period the Analytics tab is compared with - yesterday, the 7
 * days before, or the same days last month (previousWindow, tested).
 *
 * `kwh` is null until a read has come back, and stays null when it fails, so a
 * failed read is never compared as "you used nothing before".
 *
 * Results are kept for the session by user and window: switching tabs back
 * and forth costs no extra reads.
 */
const cache = new Map();

export const usePreviousPeriod = (tab) => {
  const { user } = useAuth();
  const window = previousWindow(tab, getManilaDateKey());
  const key = user?.uid ? `${user.uid}|${window.startDate}|${window.endDate}` : null;
  const [kwh, setKwh] = useState(() => (key && cache.has(key) ? cache.get(key) : null));

  useEffect(() => {
    if (!key) {
      setKwh(null);
      return undefined;
    }
    if (cache.has(key)) {
      setKwh(cache.get(key));
      return undefined;
    }
    let cancelled = false;
    setKwh(null);
    historyService.getUsageByDateRange(user.uid, window.startDate, window.endDate)
      .then((result) => {
        if (cancelled || !result?.success) return;
        const total = sumKwh(result.data);
        cache.set(key, total);
        setKwh(total);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // window is derived from tab and today; key captures both.
  }, [key]);

  return { kwh, label: window.label, window };
};

export default usePreviousPeriod;
