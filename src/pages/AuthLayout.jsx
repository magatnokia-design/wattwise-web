import AppShowcase from '../components/auth/AppShowcase';
import PowerPreview from '../components/auth/PowerPreview';
import styles from './AuthLayout.module.css';

// Bodies are kept to one line at this column width on purpose — three
// two-line rows was most of what pushed the panel past a single viewport.
const FEATURES = [
  {
    icon: '🔌',
    title: 'Both outlets, side by side',
    body: 'Live wattage for each, above the fold.',
  },
  {
    icon: '⚡',
    title: 'Switch a real relay',
    body: 'Toggle here; the hardware follows.',
  },
  {
    icon: '🧾',
    title: 'PELCO III, itemised',
    body: 'Every block of the tariff, explained.',
  },
];

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
                {feature.icon}
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
