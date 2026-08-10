import styles from './DownloadApp.module.css';

// Expo build page for the current Android release. Swap this when a new build
// is published — it is the only place the URL appears.
export const ANDROID_BUILD_URL =
  'https://expo.dev/accounts/magat_nokia/projects/WiseWatt/builds/dd16460c-5af8-4318-a3eb-7ab9e541e824';

/**
 * The only route to a new account, since registration does not exist on the
 * web. Kept to three lines: a reason, the action, and the one caveat that
 * actually trips people up when installing an Expo build.
 */
export const DownloadApp = () => (
  <div className={styles.card}>
    <p className={styles.lead}>
      <span className={styles.icon} aria-hidden="true">
        📱
      </span>
      No account yet? Create one in the app.
    </p>

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

    <p className={styles.note}>Android only · you may need to allow unknown sources</p>
  </div>
);

export default DownloadApp;
