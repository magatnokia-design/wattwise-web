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
import { getFirestore } from "firebase/firestore";
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

export const auth = getAuth(app);

// Fire and forget. setPersistence resolves before any sign-in call that follows
// it in the same tick, and a failure (private mode with storage blocked) must
// degrade to in-memory persistence rather than break sign-in entirely.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Could not enable local auth persistence:', error?.message);
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Cloud Functions (region: asia-southeast1)
export const functions = getFunctions(app, 'asia-southeast1');

export default app;
