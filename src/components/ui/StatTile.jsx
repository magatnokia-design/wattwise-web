import styles from './StatTile.module.css';

/**
 * One figure with its unit and label. Value and unit are separate so the number
 * can be sized up without the unit growing with it.
 */
export const StatTile = ({ label, value, unit, caption, tone = 'default', icon }) => (
  <div className={`${styles.tile} ${styles[tone]}`}>
    <div className={styles.labelRow}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
    </div>
    <p className={styles.value}>
      <span className="ww-num">{value}</span>
      {unit ? <span className={styles.unit}>{unit}</span> : null}
    </p>
    {caption ? <p className={styles.caption}>{caption}</p> : null}
  </div>
);

export const StatGrid = ({ children, min = 160 }) => (
  <div
    className={styles.grid}
    style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}
  >
    {children}
  </div>
);

export default StatTile;
