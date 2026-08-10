// Friendly text for the Firebase Auth codes authService is known to return.
// The code list mirrors `isExpectedAuthError` in
// src/services/firebase/authService.js — those are the failures that are the
// user's to fix, so they get a plain sentence instead of a raw Firebase string.
const MESSAGES = {
  'auth/invalid-credential': 'That email and password do not match an account.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'That email and password do not match an account.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Could not reach WattWise. Check your connection.',
  'auth/email-already-in-use': 'An account already uses this email.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/weak-password': 'Pick a stronger password.',
  'auth/operation-not-allowed': 'Email sign-in is not enabled for this project.',
  'auth/unauthorized-domain':
    'This site is not an authorised domain for the WattWise Firebase project. Add it under Authentication → Settings → Authorized domains.',
};

export const describeAuthError = (code, fallback = 'Something went wrong. Try again.') =>
  MESSAGES[code] || fallback;

/** Same rule set the phone app's RegisterScreen enforces. */
export const validatePassword = (password) => ({
  minLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasLowerCase: /[a-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
});
