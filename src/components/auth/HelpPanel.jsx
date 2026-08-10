import { ANDROID_BUILD_URL } from './DownloadApp';
import styles from './HelpPanel.module.css';

// Change these to whatever you want published. This is the only place they
// appear, and they are visible to anyone who opens the sign-in page.
export const CONTACT = {
  email: 'magatnokia@gmail.com',
  repo: 'https://github.com/magatnokia-design/wattwise-web',
};

/**
 * Answers to the questions this setup actually raises — an empty dashboard, a
 * toggle that seems to do nothing, where the bill total comes from. Every
 * answer here matches how the system genuinely behaves; none of it is
 * aspirational.
 *
 * Native <details> so it is keyboard-operable and works with the accordion
 * collapsed on first paint.
 */
const FAQS = [
  {
    q: 'Do I need the mobile app?',
    a: 'Yes, at least once. Accounts are created in the Android app because that is where the ESP32 is paired to them. After that you can sign in here with the same account.',
  },
  {
    q: 'Why is my dashboard empty?',
    a: 'Because nothing has been measured yet. WattWise never fills space with sample figures — readings appear the moment the ESP32 posts telemetry. Check it is powered on and linked under Settings.',
  },
  {
    q: 'Does switching an outlet here really work?',
    a: 'Yes. The command goes to the server, and the device picks it up on its next poll — usually within a second. It makes no difference whether the switch came from this browser or your phone.',
  },
  {
    q: 'How is my bill worked out?',
    a: 'PELCO III residential rates, in three blocks. You enter Block 1 (generation and transmission) from your paper bill; Blocks 2 and 3 are ERC constants. Analytics itemises every line.',
  },
  {
    q: 'Can other people see my usage?',
    a: 'No. Every reading is stored under your account and the database rules check that on every read. Signing in on the web reads the same private data as your phone.',
  },
];

export const HelpPanel = () => (
  <div className={styles.panel}>
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>Common questions</h3>
      <div className={styles.faqList}>
        {FAQS.map((item) => (
          <details key={item.q} className={styles.faq}>
            <summary className={styles.question}>
              <span>{item.q}</span>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </summary>
            <p className={styles.answer}>{item.a}</p>
          </details>
        ))}
      </div>
    </section>

    <section className={styles.block}>
      <h3 className={styles.blockTitle}>Get in touch</h3>
      <div className={styles.links}>
        <a className={styles.link} href={`mailto:${CONTACT.email}`}>
          <span className={styles.linkIcon} aria-hidden="true">
            ✉️
          </span>
          <span className={styles.linkText}>
            <strong>Email support</strong>
            <span className={styles.linkSub}>{CONTACT.email}</span>
          </span>
        </a>

        <a
          className={styles.link}
          href={ANDROID_BUILD_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className={styles.linkIcon} aria-hidden="true">
            📱
          </span>
          <span className={styles.linkText}>
            <strong>Get the Android app</strong>
            <span className={styles.linkSub}>Latest build on Expo</span>
          </span>
        </a>

        <a className={styles.link} href={CONTACT.repo} target="_blank" rel="noreferrer noopener">
          <span className={styles.linkIcon} aria-hidden="true">
            🐙
          </span>
          <span className={styles.linkText}>
            <strong>Source & issues</strong>
            <span className={styles.linkSub}>GitHub repository</span>
          </span>
        </a>
      </div>
    </section>
  </div>
);

export default HelpPanel;
