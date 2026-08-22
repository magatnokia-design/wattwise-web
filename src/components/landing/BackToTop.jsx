import { useEffect, useState } from 'react';
import { scrollToTop } from '../../utils/scrollToTop';
import styles from './BackToTop.module.css';

/**
 * A return-to-top control for the landing page.
 *
 * The page runs to several screens — features, the cost estimator, the safety
 * ladder, the FAQ — and the nav bar is sticky but the only way back to the
 * header was to keep scrolling. This appears once there is enough page above
 * you for the trip to be worth taking, and stays out of the way until then.
 *
 * The threshold is a screen and a half rather than a fixed pixel count, so it
 * behaves the same on a phone as on a desktop: on a short viewport it appears
 * sooner in absolute terms, which is when it is actually needed.
 */
const SHOW_AFTER_SCREENS = 1.5;

export const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS);
    };

    update();
    // Passive: this only reads scroll position and never calls preventDefault,
    // so the browser can keep scrolling on its own thread.
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <button
      type="button"
      className={`${styles.button} ${visible ? styles.visible : ''}`}
      onClick={scrollToTop}
      // Hidden from the tab order and from screen readers while it is faded
      // out, so a keyboard user cannot land on a control they cannot see.
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : 'true'}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
      <span className={styles.label}>Top</span>
    </button>
  );
};

export default BackToTop;
