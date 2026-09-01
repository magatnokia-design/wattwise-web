import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from './config';

/**
 * Monthly statements, read-only.
 *
 * These documents are written entirely server-side - `processMonthlyInvoice`
 * builds one when a period closes and `finalizeInvoice` rewrites it with the
 * official PELCO III rates - and Firestore rules make the collection read-only
 * to clients (`allow write: if false`).
 *
 * The web client has no statements screen; finalizing a month is done from the
 * phone app. This exists so Compare Usage can show a finalized month at the
 * figure it was actually billed, rather than recomputing an estimate that the
 * emailed statement then contradicts.
 */
export const invoiceService = {
  /**
   * One month's statement, or null when that month has none.
   *
   * A month with no invoice yet is a legitimate answer rather than a failure -
   * one is only written once the period closes.
   *
   * A `getDoc` REJECTS when there is no connection instead of resolving empty
   * from the cache, so an unreachable read arrives here as an error and is
   * reported as one. Callers must not read that as "not finalized".
   */
  /**
   * The most recent statements, newest first, keyed by caller.
   *
   * One query instead of twelve `getDoc` calls, which is what the month rail
   * would otherwise need to price a year.
   *
   * Ordered by the stored `billingMonth` field, not by `__name__`. The document
   * id is the billing month and sorts identically, but Firestore's automatic
   * index on document ids is ASCENDING only - a descending `orderBy('__name__')`
   * demands a composite index that does not exist, and the phone app's
   * statements screen opened to "The query requires an index" because of it.
   */
  getInvoices: async (userId, max = 12) => {
    try {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const invoicesRef = collection(db, 'users', userId, 'invoices');
      const snapshot = await getDocs(
        query(invoicesRef, orderBy('billingMonth', 'desc'), limit(max))
      );

      return {
        success: true,
        data: snapshot.docs.map((docSnapshot) => ({
          ...docSnapshot.data(),
          billingMonth: docSnapshot.id,
        })),
      };
    } catch (error) {
      console.error('Error getting invoices:', error);
      return { success: false, error: error.message, code: error.code };
    }
  },

  getInvoice: async (userId, billingMonth) => {
    try {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const snapshot = await getDoc(doc(db, 'users', userId, 'invoices', billingMonth));
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: { ...snapshot.data(), billingMonth: snapshot.id } };
    } catch (error) {
      console.error('Error getting invoice:', error);
      return { success: false, error: error.message, code: error.code };
    }
  },
};

export default invoiceService;
