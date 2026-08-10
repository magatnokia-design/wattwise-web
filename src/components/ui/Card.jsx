import styles from './Card.module.css';

export const Card = ({ children, className = '', padded = true, as: Tag = 'section', ...rest }) => (
  <Tag className={`${styles.card} ${padded ? styles.padded : ''} ${className}`} {...rest}>
    {children}
  </Tag>
);

export const CardHeader = ({ title, subtitle, action, className = '' }) => (
  <header className={`${styles.header} ${className}`}>
    <div className={styles.headerText}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
    </div>
    {action ? <div className={styles.action}>{action}</div> : null}
  </header>
);

export default Card;
