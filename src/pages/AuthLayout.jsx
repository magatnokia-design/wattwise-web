import PowerPreview from '../components/auth/PowerPreview';
import styles from './AuthLayout.module.css';

const FEATURES = [
  {
    icon: '🔌',
    title: 'Both outlets, side by side',
    body: 'Live wattage for each, above the fold — no scrolling between them.',
  },
  {
    icon: '⚡',
    title: 'Switch a real relay',
    body: 'Toggle here and the hardware follows; your phone reflects it in a second.',
  },
  {
    icon: '🧾',
    title: 'PELCO III, itemised',
    body: 'Every block of the tariff, so the total is explainable rather than asserted.',
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
        <p className={styles.asideEyebrow}>Same account · same hardware</p>
        <h2 className={styles.asideTitle}>
          Everything the phone app does — with room to actually read it.
        </h2>

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
