import { useState } from 'react';
import styles from './AppShowcase.module.css';

/**
 * Design holder for the product shots.
 *
 * Drop images into `public/showcase/` named `web.png` and `phone.png` and they
 * appear here automatically — no code change. Until then each frame renders a
 * styled empty state, so a visitor sees an intentional-looking device mock-up
 * rather than a broken image or developer instructions.
 */
const VIEWS = [
  {
    id: 'web',
    label: 'Web',
    src: '/showcase/web.png',
    alt: 'The WattWise dashboard in a browser',
  },
  {
    id: 'phone',
    label: 'Phone',
    src: '/showcase/phone.png',
    alt: 'The WattWise app on Android',
  },
];

export const AppShowcase = () => {
  const [active, setActive] = useState('web');
  const [missing, setMissing] = useState({});

  const view = VIEWS.find((entry) => entry.id === active) || VIEWS[0];
  const hasImage = !missing[view.id];

  return (
    <div className={styles.showcase}>
      <div className={styles.tabs} role="tablist" aria-label="Product view">
        {VIEWS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={active === entry.id}
            className={`${styles.tab} ${active === entry.id ? styles.tabActive : ''}`}
            onClick={() => setActive(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className={styles.stage}>
        {active === 'web' ? (
          <div className={styles.browser}>
            <div className={styles.browserBar}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.urlBar}>wattwise.site</span>
            </div>
            <div className={styles.screen}>
              {hasImage ? (
                <img
                  src={view.src}
                  alt={view.alt}
                  className={styles.shot}
                  loading="lazy"
                  onError={() => setMissing((current) => ({ ...current, web: true }))}
                />
              ) : (
                <Placeholder />
              )}
            </div>
          </div>
        ) : (
          <div className={styles.phone}>
            <span className={styles.notch} aria-hidden="true" />
            <div className={styles.screen}>
              {hasImage ? (
                <img
                  src={view.src}
                  alt={view.alt}
                  className={styles.shot}
                  loading="lazy"
                  onError={() => setMissing((current) => ({ ...current, phone: true }))}
                />
              ) : (
                <Placeholder compact />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Placeholder = ({ compact = false }) => (
  <div className={`${styles.placeholder} ${compact ? styles.placeholderCompact : ''}`}>
    <span className={styles.placeholderMark} aria-hidden="true">
      ⚡
    </span>
    <span className={styles.placeholderBars} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  </div>
);

export default AppShowcase;
