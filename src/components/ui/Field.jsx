import { useId } from 'react';
import styles from './Field.module.css';

export const TextField = ({ label, hint, error, prefix, suffix, className = '', ...rest }) => {
  const id = useId();

  return (
    <div className={`${styles.field} ${className}`}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className={`${styles.control} ${error ? styles.controlError : ''}`}>
        {prefix ? <span className={styles.affix}>{prefix}</span> : null}
        <input id={id} className={styles.input} aria-invalid={!!error || undefined} {...rest} />
        {suffix ? <span className={styles.affix}>{suffix}</span> : null}
      </div>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
};

export const SelectField = ({ label, hint, options = [], className = '', ...rest }) => {
  const id = useId();

  return (
    <div className={`${styles.field} ${className}`}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className={styles.control}>
        <select id={id} className={styles.select} {...rest}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
};

export default TextField;
