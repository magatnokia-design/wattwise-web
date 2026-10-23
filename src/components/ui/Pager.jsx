import tableStyles from './DataTable.module.css';

/**
 * "Showing 11–20 of 37 · ← Previous · Page 2 of 4 · Next →" (Oct 2026) - the
 * one pager on this site, so History, Notifications and the tables all page
 * the same way. Draws nothing when everything fits on one page.
 *
 * @param {number} page        1-based.
 * @param {number} totalPages
 * @param {string} [info]      Left-hand text, e.g. describeRange(...).
 */
export const Pager = ({ page, totalPages, info, onPrevious, onNext, busy = false, label = 'Pages' }) => {
  if (!(totalPages > 1)) return null;
  return (
    <nav className={tableStyles.pagination} aria-label={label}>
      <p className={tableStyles.pageInfo}>{info}</p>
      <div className={tableStyles.pageControls}>
        <button
          type="button"
          className={tableStyles.pageButton}
          onClick={onPrevious}
          disabled={page <= 1 || busy}
        >
          ← Previous
        </button>
        <span className={tableStyles.pageCount}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={tableStyles.pageButton}
          onClick={onNext}
          disabled={page >= totalPages || busy}
        >
          Next →
        </button>
      </div>
    </nav>
  );
};

export default Pager;
