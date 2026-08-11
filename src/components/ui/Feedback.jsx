import styles from './Feedback.module.css';

/** tone: 'neutral' | 'good' | 'warn' | 'alert' | 'danger' | 'info' */
export const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span className={`${styles.badge} ${styles[tone]} ${className}`}>{children}</span>
);

export const Banner = ({ tone = 'warn', title, children, action }) => (
  <div className={`${styles.banner} ${styles[tone]}`} role="status">
    <div className={styles.bannerBody}>
      {title ? <strong className={styles.bannerTitle}>{title}</strong> : null}
      <span>{children}</span>
    </div>
    {action ? <div className={styles.bannerAction}>{action}</div> : null}
  </div>
);

/**
 * Shown wherever the hardware has not reported yet. Deliberately says "nothing
 * recorded" rather than filling the space with sample numbers — an empty
 * dashboard is the correct state until the ESP32 posts.
 */
export const EmptyState = ({ icon = '⚡', title, children }) => (
  <div className={styles.empty}>
    <span className={styles.emptyIcon} aria-hidden="true">
      {icon}
    </span>
    <p className={styles.emptyTitle}>{title}</p>
    {children ? <p className={styles.emptyBody}>{children}</p> : null}
  </div>
);

export const Spinner = ({ label = 'Loading' }) => (
  <div className={styles.spinnerWrap} role="status" aria-label={label}>
    <span className={styles.spinner} />
  </div>
);

export const ErrorText = ({ children }) =>
  children ? <p className={styles.errorText}>{children}</p> : null;
