import styles from './Button.module.css';

/**
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * size:    'sm' | 'md'
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    <span className={loading ? styles.loadingLabel : undefined}>{children}</span>
  </button>
);

export default Button;
