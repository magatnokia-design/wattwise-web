import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { historyService, userService } from '../services/firebase';
import { auth } from '../services/firebase/config';
import { summarizeDailyEntries } from '../screens/ReferenceComparison/utils/comparisonHelpers';

/*
 * Totals for every month the comparison picker offers, so the rail can show the
 * shape of the year instead of hiding it behind a dropdown.
 *
 * Web-only, and it has to be. `useReferenceComparison` is byte-identical to the
 * phone app's copy, and the phone has no rail to feed — adding a twelve-month
 * fetch to it would re-open the exact drift both repos spent a day closing. It
 * reads through the same service call and the same helper as that hook, so a
 * month totals the same here as it does there.
 *
 * Twelve range queries on mount. That is fine for what this is — one account,
 * one apartment — and they run once per sign-in, not per render.
 */
export const useMonthStrip = (monthOptions) => {
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        if (!cancelled) {
          setTotals({});
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);

      // Same source the two compared months use, so the rail cannot disagree
      // with the cards below it.
      const preferences = await userService.getUserPreferences(user.uid);
      const rates = preferences?.success
        ? {
          supplyRates: preferences.data?.supplyRates || null,
          profileId: preferences.data?.rateProfileId || null,
        }
        : {};

      const entries = await Promise.all(
        monthOptions.map(async (option) => {
          const result = await historyService.getUsageByDateRange(
            user.uid,
            `${option.value}-01`,
            `${option.value}-31`
          );

          return [
            option.value,
            result.success ? summarizeDailyEntries(result.data, rates) : null,
          ];
        })
      );

      if (cancelled) return;

      setTotals(Object.fromEntries(entries.filter(([, value]) => value !== null)));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [monthOptions]);

  return { monthTotals: totals, loadingStrip: loading };
};

export default useMonthStrip;
