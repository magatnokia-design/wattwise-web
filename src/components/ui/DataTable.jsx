import { useEffect, useMemo, useState } from 'react';
import { resolvePage, describeRange } from './pagination';
import styles from './DataTable.module.css';

/**
 * Sortable table. Desktop is the target here — the phone app cannot show more
 * than two columns at once, so History and Analytics use the extra width for
 * real tables rather than stacked cards.
 *
 * columns: [{ key, header, align?, width?, sortable?, sortValue?, render? }]
 *
 * `pageSize` is opt-in: without it the table renders every row exactly as before.
 * `resetKey` is what the caller is listing — change it and paging returns to the
 * first page. Row arrivals deliberately do not, because the Activity log streams
 * live and being pulled back to the top mid-read is worse than a stale page
 * number, which resolvePage clamps anyway.
 */
export const DataTable = ({
  columns,
  rows,
  rowKey,
  empty = null,
  defaultSort = null,
  pageSize = null,
  resetKey = null,
}) => {
  const [sort, setSort] = useState(defaultSort); // { key, direction }
  const [page, setPage] = useState(1);

  // A different filter is a different list, so start it at the top. Sorting
  // reorders the same list and gets the same treatment: page 3 of a descending
  // sort has nothing to do with page 3 of an ascending one.
  useEffect(() => {
    setPage(1);
  }, [resetKey, sort]);

  const sorted = useMemo(() => {
    if (!sort?.key) return rows;

    const column = columns.find((entry) => entry.key === sort.key);
    if (!column) return rows;

    const valueOf = column.sortValue || ((row) => row[column.key]);
    const factor = sort.direction === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * factor;
      }
      return String(left ?? '').localeCompare(String(right ?? '')) * factor;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'desc' };
      if (current.direction === 'desc') return { key, direction: 'asc' };
      return null;
    });
  };

  const paged = pageSize
    ? resolvePage({ page, totalRows: sorted.length, pageSize })
    : null;
  const visible = paged ? sorted.slice(paged.start, paged.end) : sorted;

  if (!rows.length && empty) {
    return empty;
  }

  return (
    <>
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              const ariaSort = isSorted
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none';

              return (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width, textAlign: column.align || 'left' }}
                  aria-sort={column.sortable ? ariaSort : undefined}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className={`${styles.sortButton} ${isSorted ? styles.sortActive : ''}`}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.header}
                      <span className={styles.sortIcon} aria-hidden="true">
                        {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : index}>
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align || 'left' }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Only worth drawing when there is more than one page to move between. */}
    {paged && paged.totalPages > 1 ? (
      <nav className={styles.pagination} aria-label="Table pages">
        <p className={styles.pageInfo}>
          {describeRange({ start: paged.start, end: paged.end, totalRows: sorted.length })}
        </p>
        <div className={styles.pageControls}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage(paged.page - 1)}
            disabled={!paged.hasPrevious}
          >
            ← Previous
          </button>
          <span className={styles.pageCount}>
            Page {paged.page} of {paged.totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage(paged.page + 1)}
            disabled={!paged.hasNext}
          >
            Next →
          </button>
        </div>
      </nav>
    ) : null}
    </>
  );
};

export default DataTable;
