import { useMemo, useState } from 'react';
import styles from './DataTable.module.css';

/**
 * Sortable table. Desktop is the target here — the phone app cannot show more
 * than two columns at once, so History and Analytics use the extra width for
 * real tables rather than stacked cards.
 *
 * columns: [{ key, header, align?, width?, sortable?, sortValue?, render? }]
 */
export const DataTable = ({ columns, rows, rowKey, empty = null, defaultSort = null }) => {
  const [sort, setSort] = useState(defaultSort); // { key, direction }

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

  if (!rows.length && empty) {
    return empty;
  }

  return (
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
          {sorted.map((row, index) => (
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
  );
};

export default DataTable;
