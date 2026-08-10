import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

export const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className={styles.page}>
    <div className={styles.panel}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          ⚡
        </span>
        <span className={styles.brandName}>WattWise</span>
      </div>

      <h1 className={styles.title}>{title}</h1>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

      <div className={styles.form}>{children}</div>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>

    <aside className={styles.aside}>
      <div className={styles.asideInner}>
        <p className={styles.asideEyebrow}>Same account, same hardware</p>
        <h2 className={styles.asideTitle}>
          Everything the phone app does — with room to actually read it.
        </h2>
        <ul className={styles.asideList}>
          <li>Both outlets side by side, with live wattage</li>
          <li>Toggle a relay from the browser; the phone sees it in a second</li>
          <li>PELCO III billing broken down block by block</li>
        </ul>
      </div>
      <p className={styles.asideFoot}>
        Signing in here uses the same WattWise account as the Android app.{' '}
        <Link to="/register">Create one</Link> if you do not have it yet.
      </p>
    </aside>
  </div>
);

export default AuthLayout;
