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

/**
 * What a page shows when it could not reach Firestore and therefore does not
 * know what the account holds.
 *
 * Distinct from `EmptyState`, and the difference is the whole point: an empty
 * state asserts there is nothing to show, which is a claim about the account.
 * This one says the question could not be asked. Every list on this site fell
 * back to the former, so a browser with no connection reported no bills, no
 * budget and no alerts to an account that had all three.
 *
 * Deliberately not styled as an error. Nothing has failed and nothing needs
 * repairing; the browser is out of contact, which is ordinary and usually
 * resolves itself.
 */
export const OfflineState = ({
  title = "Can't reach WattWise",
  children = 'Your data is safe — the page just needs a connection to load it. Check your network, then try again.',
  onRetry,
  retryLabel = 'Try again',
}) => (
  <div className={styles.empty} role="status">
    <span className={styles.emptyIcon} aria-hidden="true">
      📡
    </span>
    <p className={styles.emptyTitle}>{title}</p>
    <p className={styles.emptyBody}>{children}</p>
    {onRetry ? (
      <button type="button" className={styles.emptyRetry} onClick={onRetry}>
        {retryLabel}
      </button>
    ) : null}
  </div>
);

export const Spinner = ({ label = 'Loading' }) => (
  <div className={styles.spinnerWrap} role="status" aria-label={label}>
    <span className={styles.spinner} />
  </div>
);

export const ErrorText = ({ children }) =>
  children ? <p className={styles.errorText}>{children}</p> : null;
