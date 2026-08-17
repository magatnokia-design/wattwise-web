import { ANDROID_APK_URL } from '../../constants/appRelease';
import styles from './DownloadApp.module.css';

/*
 * Was a hard-coded Expo build URL that had gone stale — it pointed at a build
 * from before the APK moved to GitHub releases. The address now comes from
 * constants/appRelease.js, which the landing page uses too, so a new release is
 * one version string rather than a hunt for copies.
 */
export { ANDROID_APK_URL };

/**
 * The only route to a new account, since registration does not exist on the
 * web. Kept to three lines: a reason, the action, and the one caveat that
 * actually trips people up installing an APK from outside the Play Store.
 *
 * Currently unmounted — LoginPage explains where. The landing page carries the
 * download now.
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
      href={ANDROID_APK_URL}
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
