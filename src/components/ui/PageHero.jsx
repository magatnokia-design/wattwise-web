import styles from './PageHero.module.css';

/**
 * The stand-out top of every page (Oct 2026) - the Dashboard's "Right now"
 * banner, made shared so each page opens the same way: one big figure, the
 * few numbers that go with it, and an optional line or bar under them.
 *
 * @param {string} label        Small line above the figure.
 * @param {string|number} value The figure.
 * @param {string} [unit]
 * @param {{ label: string, value: string }[]} [stats]
 * @param {'neutral'|'live'|'warn'|'danger'} [tone]  live = green wash.
 * @param {boolean} [pulse]     A live dot beside the label.
 * @param {React.ReactNode} [children]  Under the stats, e.g. a progress bar.
 */
export const PageHero = ({ label, value, unit, stats = [], tone = 'neutral', pulse = false, children, style }) => (
  <section className={`${styles.hero} ${styles[tone] || ''}`} style={style}>
    <div className={styles.top}>
      <div className={styles.main}>
        <span className={styles.label}>
          {pulse ? <span className={styles.dot} aria-hidden="true" /> : null}
          {label}
        </span>
        <p className={styles.value}>
          <span className="ww-num">{value}</span>
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </p>
      </div>
      {stats.length > 0 ? (
        <dl className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd className="ww-num">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
    {children ? <div className={styles.extra}>{children}</div> : null}
  </section>
);

export default PageHero;
