import { Link } from 'react-router-dom';
import AppShowcase from '../components/auth/AppShowcase';
import PowerPreview from '../components/auth/PowerPreview';
import { Wordmark } from '../components/ui/Wordmark';
import styles from './AuthLayout.module.css';
import { Icon } from '../components/ui/Icon';

// Bodies are kept to one line at this column width on purpose — three
// two-line rows was most of what pushed the panel past a single viewport.
const FEATURES = [
  {
    icon: 'power-outline',
    title: 'Both outlets, side by side',
    body: 'Live wattage for each, above the fold.',
  },
  {
    icon: 'flash-outline',
    title: 'Switch a real relay',
    body: 'Toggle here; the hardware follows.',
  },
  {
    icon: 'receipt-outline',
    title: 'PELCO III, itemised',
    body: 'Every block of the tariff, explained.',
  },
];

/**
 * `backTo` is optional. Sign-in is reachable straight from the landing page's
 * header, and once you were on it the only way back was the browser's own back
 * button - which is not obvious on a phone, and gone entirely if the page was
 * opened from a link. Pages that already offer a way out in their footer, like
 * forgot-password, simply do not pass it.
 */
export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  backTo,
  backLabel = 'Back',
}) => (
  <div className={styles.page}>
    <div className={styles.panel}>
      <div className={styles.panelInner}>
        {backTo ? (
          <Link className={styles.back} to={backTo}>
            <span aria-hidden="true">&larr;</span>
            {backLabel}
          </Link>
        ) : null}

        <div className={styles.brand}>
          <Wordmark height={32} />
        </div>

        {/* The form sits on a raised card. On a plain white page a white form
            has no edges — nothing tells you where the sign-in box begins. */}
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

          <div className={styles.form}>{children}</div>

          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </div>
      </div>
    </div>

    <aside className={styles.aside}>
      <div className={styles.asideInner}>
        <header className={styles.asideHead}>
          <p className={styles.asideEyebrow}>Same account · same hardware</p>
          <h2 className={styles.asideTitle}>
            Everything the phone app does — with room to actually read it.
          </h2>
        </header>

        <AppShowcase />

        <PowerPreview />

        <ul className={styles.featureList}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                <Icon name={feature.icon} />
              </span>
              <div>
                <p className={styles.featureTitle}>{feature.title}</p>
                <p className={styles.featureBody}>{feature.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  </div>
);

export default AuthLayout;
