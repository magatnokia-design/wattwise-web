// Firebase Configuration
//
// Copied from the phone app (C:\App\WattWise\src\services\firebase\config.js).
// The ONLY change is auth persistence: the phone app uses
// getReactNativePersistence(AsyncStorage), which does not exist in a browser.
// browserLocalPersistence is the web equivalent — without it every page refresh
// (F5) signs the user out.
//
// firebaseConfig below is byte-identical to the phone app's. It must stay that
// way: the ESP32 posts telemetry to asia-southeast1-wattwise-fe394, so a
// different project would leave this app watching an empty database while the
// hardware talks to the real one — silently, with no error.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD0jBN6PpEPyWuw1On83_T9BIXWhhCoqMo",
  authDomain: "wattwise-fe394.firebaseapp.com",
  projectId: "wattwise-fe394",
  storageBucket: "wattwise-fe394.firebasestorage.app",
  messagingSenderId: "421489842338",
  appId: "1:421489842338:web:8ff17e69503589123d1ffb"
};

// Reuse app/auth instances in Fast Refresh to avoid duplicate initialization issues.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/*
 * App Check — website only, and monitoring only.
 *
 * The phone app cannot take part. Both clients use the Firebase JS SDK, whose
 * App Check providers are reCAPTCHA-based and need a DOM that React Native does
 * not have; enforcement is also switched on per product rather than per client,
 * so turning it on would reject every call from the phone. Enforcement therefore
 * lives in the callables themselves (functions/src/lib/rateLimiter.js), which
 * covers the phone, this site and a script equally.
 *
 * What this buys is visibility: the Firebase console splits traffic into
 * verified and unverified, so we can see whether anything other than this site
 * calls the backend before deciding to enforce anything.
 *
 * Deliberately inert without a key. The site key is public by design — it ships
 * in this bundle either way — but reading it from the environment keeps it out
 * of the repository, and a missing key must degrade to "no App Check" rather
 * than break sign-in for everyone.
 */
const appCheckSiteKey = import.meta.env?.VITE_APPCHECK_RECAPTCHA_KEY;

if (appCheckSiteKey) {
  // Imported lazily so a build without a key never carries the App Check code.
  import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    })
    .catch((error) => {
      // Never fatal. While enforcement is off, a failed attestation costs
      // nothing but a missing datapoint in the console.
      console.warn('App Check unavailable:', error?.message);
    });
}

export const auth = getAuth(app);

// Fire and forget. setPersistence resolves before any sign-in call that follows
// it in the same tick, and a failure (private mode with storage blocked) must
// degrade to in-memory persistence rather than break sign-in entirely.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Could not enable local auth persistence:', error?.message);
});

// Firestore, with the transport allowed to fall back.
//
// The SDK streams live updates over a WebChannel, which some networks and
// most captive or proxied Wi-Fi will not carry cleanly. When it fails the
// console fills with
//
//   WebChannelConnection RPC 'Listen' stream transport errored
//   Failed to load resource: the server responded with a status of 400
//
// and live updates stall until the SDK gives up and reconnects. Seen on the
// owner's own network on 4 Sep 2026, alongside the ESP32 losing its posts in
// the same minutes - two devices, one flaky path.
//
// autoDetectLongPolling lets the SDK notice that and switch to long polling
// instead, which survives networks WebChannel does not. It costs a round trip
// on a connection that works and rescues one that does not.
//
// Web only. The phone app talks to Firestore over React Native's own
// networking and needs none of this - the same reason auth persistence
// differs between the two config files.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// Initialize Cloud Functions (region: asia-southeast1)
export const functions = getFunctions(app, 'asia-southeast1');

export default app;
