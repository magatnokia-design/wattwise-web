/**
 * The published Android build.
 *
 * One place, because the version appears in three: the download button's label,
 * the direct asset URL, and the "what you are installing" line beside it. When a
 * new APK is released, change `ANDROID_VERSION` and nothing else — the asset URL
 * is built from it, and it matches the naming the GitHub releases already use
 * (`WattWise-v1.0.2.apk`, `WattWise-v1.0.3.apk`).
 *
 * The direct link is deliberate rather than GitHub's `/releases/latest/download/`
 * shortcut: that form needs a filename that never changes, and ours carries the
 * version. `RELEASES_URL` is the fallback for anyone arriving after a newer build
 * is out.
 */
export const ANDROID_VERSION = '1.0.7';

export const REPO_URL = 'https://github.com/magatnokia-design/WattWise';

export const RELEASES_URL = `${REPO_URL}/releases`;

export const ANDROID_APK_URL =
  `${REPO_URL}/releases/download/v${ANDROID_VERSION}/WattWise-v${ANDROID_VERSION}.apk`;

/**
 * Rounded from the built artifact, so the page states the real transfer size.
 *
 * Was 107, which was accurate and also the problem: the APK carried x86 and
 * x86_64 native libraries that only a PC emulator can run, and the download was
 * stalling on phone data before it finished. Building for the two ARM
 * architectures alone takes it to 61 MB with the app itself unchanged.
 */
export const ANDROID_APK_SIZE_MB = 61;
