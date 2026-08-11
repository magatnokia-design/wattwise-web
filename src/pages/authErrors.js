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

  // Action-code failures, from the links in Firebase's emails. Both of the
  // first two present identically to a user, and both mean "ask for a new
  // link" - Firebase invalidates earlier codes when a newer one is issued, so
  // an old email in the inbox is dead even well inside the hour.
  'auth/expired-action-code':
    'This link has expired. Reset links last one hour — request a new one below.',
  'auth/invalid-action-code':
    'This link is no longer valid. It may have been used already, or replaced by a newer one — request a fresh link below.',
  'auth/user-disabled': 'This account has been disabled. Contact support@wattwise.site.',

  // Raised by the sendPasswordResetEmail / sendVerificationEmail callables,
  // which throttle to one message per address per minute. WattWise sends its own
  // auth mail because Firebase will not let this project brand its templates,
  // and that makes the reset endpoint the one a stranger can trigger.
  'resource-exhausted':
    'A link was just sent. Check your inbox, and your spam folder, before asking for another.',
};

export const describeAuthError = (code, fallback = 'Something went wrong. Try again.') =>
  MESSAGES[code] || fallback;
