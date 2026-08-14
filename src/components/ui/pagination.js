/*
 * Page arithmetic for DataTable, kept out of the component so it can be tested.
 *
 * The whole job is off-by-one handling and one behaviour that is easy to get
 * wrong: the Activity log is a **live** listener, so rows arrive while the user
 * is reading. A page number stored in state and used unguarded goes out of range
 * the moment a filter narrows the set, and re-anchoring on every change would
 * yank the reader back to the top each time a toggle streams in.
 *
 * So the stored page is never trusted directly — it is clamped on read. Nothing
 * resets it except an explicit change of what is being listed.
 */

/**
 * @param {object} args
 * @param {number} args.page      The page the user last asked for, 1-based.
 * @param {number} args.totalRows Rows after filtering and sorting.
 * @param {number} args.pageSize  Rows per page.
 * @returns {{ page: number, totalPages: number, start: number, end: number,
 *            hasPrevious: boolean, hasNext: boolean }}
 *   `start` is 0-based and `end` is exclusive, ready for slice(). `page`,
 *   `start` and `end` are the clamped values — never what was passed in.
 */
export const resolvePage = ({ page, totalRows, pageSize }) => {
  const size = Math.max(1, Math.floor(Number(pageSize) || 1));
  const rows = Math.max(0, Math.floor(Number(totalRows) || 0));

  // An empty table is page 1 of 1, not page 1 of 0: "Page 1 of 0" reads as a
  // fault, and the empty state is what renders there anyway.
  const totalPages = Math.max(1, Math.ceil(rows / size));

  const requested = Math.floor(Number(page) || 1);
  const safe = Math.min(Math.max(1, requested), totalPages);

  const start = (safe - 1) * size;

  return {
    page: safe,
    totalPages,
    start,
    end: Math.min(start + size, rows),
    hasPrevious: safe > 1,
    hasNext: safe < totalPages,
  };
};

/** "Showing 21–40 of 137" — or "no entries" rather than "0–0 of 0". */
export const describeRange = ({ start, end, totalRows }) => {
  if (!totalRows) return 'No entries';
  return `Showing ${start + 1}–${end} of ${totalRows}`;
};
