import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { historyService, invoiceService, userService } from '../services/firebase';
import { auth } from '../services/firebase/config';
import {
  summarizeDailyEntries,
  applyInvoiceCost,
} from '../screens/ReferenceComparison/utils/comparisonHelpers';

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
      // with the cards below it. That claim was false for a while: the card
      // showed August 2026 finalized at P85.09 while the rail directly above it
      // read P79.39, because the rail priced every month itself and never
      // looked at the invoices. Statements are read here for the same reason
      // they are read there.
      const [preferences, invoiceResult] = await Promise.all([
        userService.getUserPreferences(user.uid),
        // One query for the year rather than twelve document reads.
        invoiceService.getInvoices(user.uid, monthOptions.length),
      ]);

      const rates = preferences?.success
        ? {
          supplyRates: preferences.data?.supplyRates || null,
          profileId: preferences.data?.rateProfileId || null,
        }
        : {};

      // A failed read leaves every month on its estimate rather than asserting
      // that none of them were finalized.
      const invoices = new Map(
        (invoiceResult.success ? invoiceResult.data : [])
          .map((invoice) => [invoice.billingMonth, invoice])
      );

      const entries = await Promise.all(
        monthOptions.map(async (option) => {
          const result = await historyService.getUsageByDateRange(
            user.uid,
            `${option.value}-01`,
            `${option.value}-31`
          );

          if (!result.success) return [option.value, null];

          return [
            option.value,
            applyInvoiceCost(
              summarizeDailyEntries(result.data, rates),
              invoices.get(option.value) || null
            ),
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
