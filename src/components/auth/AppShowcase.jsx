import { useState } from 'react';
import styles from './AppShowcase.module.css';

/**
 * The device mock-ups beside the sign-in form.
 *
 * This used to load `public/showcase/web.png` and `phone.png` and fall back to a
 * drawn illustration when they were missing. Those screenshots were never taken
 * and are no longer planned, so the illustration is simply the content now —
 * the fallback was what every visitor had been seeing regardless.
 */
const VIEWS = [
  { id: 'web', label: 'Web' },
  { id: 'phone', label: 'Phone' },
];

export const AppShowcase = () => {
  const [active, setActive] = useState('web');

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
              <Illustration />
            </div>
          </div>
        ) : (
          <div className={styles.phone}>
            <span className={styles.notch} aria-hidden="true" />
            <div className={styles.screen}>
              <Illustration compact />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Decorative only — the panel's meaning is carried by the headline and feature
// rows beside it, so this is hidden from assistive tech rather than described.
const Illustration = ({ compact = false }) => (
  <div
    className={`${styles.placeholder} ${compact ? styles.placeholderCompact : ''}`}
    aria-hidden="true"
  >
    <span className={styles.placeholderMark}>⚡</span>
    <span className={styles.placeholderBars}>
      <i />
      <i />
      <i />
    </span>
  </div>
);

export default AppShowcase;
