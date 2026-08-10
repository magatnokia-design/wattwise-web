import styles from './Switch.module.css';

/**
 * The outlet control. Rendered as a real checkbox so it is keyboard- and
 * screen-reader-operable; the visible track/knob is drawn from the input.
 *
 * `checked` is driven optimistically by the caller — see DashboardPage. The
 * round trip to asia-southeast1 is real, and waiting on it before moving the
 * knob makes a working toggle feel broken.
 */
export const Switch = ({ checked, onChange, disabled = false, label, size = 'md' }) => (
  <label className={`${styles.wrap} ${styles[size]} ${disabled ? styles.disabled : ''}`}>
    <input
      type="checkbox"
      className={styles.input}
      checked={!!checked}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.checked)}
      aria-label={label}
    />
    <span className={styles.track} aria-hidden="true">
      <span className={styles.knob} />
    </span>
  </label>
);

export default Switch;
