import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './ListSection.module.css';

/*
 * Titled sections of one-line rows - the phone's SectionHeader + SectionCard +
 * SettingsRow, shared by Settings and Power Safety so both pages are laid out
 * the same way (Oct 2026).
 */

// A titled group of rows, as the phone's SectionHeader + SectionCard.
// `plain` lays the children out without the card, for content that brings
// its own cards (Power Safety's two outlets).
export const Section = ({ title, count = null, plain = false, children }) => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>
      {title}
      {count ? <span className={styles.sectionCount}>{count}</span> : null}
    </h2>
    {plain ? children : <div className={styles.sectionCard}>{children}</div>}
  </section>
);

// One line: icon, label (+ subtitle), an optional value, and either an action
// or a chevron when the whole row opens something.
// `iconStyle` recolours the icon chip, e.g. an alert in its own colour.
export const Row = ({ icon, iconStyle, label, subtitle, value, action, onClick, to, href }) => {
  const body = (
    <>
      <span className={styles.rowIcon} style={iconStyle} aria-hidden="true"><Icon name={icon} /></span>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {subtitle ? <span className={styles.rowSub}>{subtitle}</span> : null}
      </span>
      {value ? <span className={styles.rowValue}>{value}</span> : null}
      {action ? <span className={styles.rowAction}>{action}</span> : null}
      {!action && (onClick || to || href) ? (
        <span className={styles.rowChevron} aria-hidden="true"><Icon name="chevron-forward" /></span>
      ) : null}
    </>
  );
  if (to) return <Link to={to} className={`${styles.listRow} ${styles.listRowLink}`}>{body}</Link>;
  if (href) return <a href={href} className={`${styles.listRow} ${styles.listRowLink}`}>{body}</a>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${styles.listRow} ${styles.listRowLink}`}>
        {body}
      </button>
    );
  }
  return <div className={styles.listRow}>{body}</div>;
};

export const RowButton = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    className={`${styles.rowButton} ${danger ? styles.rowButtonDanger : ''}`}
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    <Icon name={icon} />
  </button>
);
