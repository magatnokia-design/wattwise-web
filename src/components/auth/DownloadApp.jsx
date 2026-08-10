import styles from './DownloadApp.module.css';

// Expo build page for the current Android release. Swap this when a new build
// is published — it is the only place the URL appears.
export const ANDROID_BUILD_URL =
  'https://expo.dev/accounts/magat_nokia/projects/WiseWatt/builds/dd16460c-5af8-4318-a3eb-7ab9e541e824';

/**
 * The only route to a new account. Registration does not exist on the web,
 * because the ESP32 is paired from the app — so this is the primary action for
 * anyone who is not already a user, and it is styled to read that way.
 */
export const DownloadApp = () => (
  <div className={styles.card}>
    <div className={styles.head}>
      <span className={styles.icon} aria-hidden="true">
        📱
      </span>
      <div>
        <p className={styles.title}>No account yet?</p>
        <p className={styles.body}>Set one up in the app, then sign in here.</p>
      </div>
    </div>

    <a
      className={styles.button}
      href={ANDROID_BUILD_URL}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span className={styles.buttonIcon} aria-hidden="true">
        ⬇
      </span>
      Download for Android
    </a>

    <p className={styles.note}>
      Android only · installs from Expo. You may need to allow installs from unknown sources.
    </p>
  </div>
);

export default DownloadApp;
