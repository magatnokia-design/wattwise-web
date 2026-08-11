// Handlers for the one-time codes Firebase puts in its emails.
//
// Deliberately NOT added to authService.js: that file is a byte-identical copy
// of the phone app's, and drift there is a defect. Nothing here has a phone
// counterpart anyway - the phone never handles action codes, because its emails
// open Firebase's own hosted page in a browser.
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';
import { auth } from './config';

// Mirrors the phone app's RegisterScreen rules, so a password accepted here is
// one the phone would also have accepted.
export const validatePassword = (password = '') => ({
  minLength: password.length >= 8,
  hasUpperCase: /[A-Z]/.test(password),
  hasLowerCase: /[a-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
});

export const isPasswordAcceptable = (password) =>
  Object.values(validatePassword(password)).every(Boolean);

/**
 * Confirms a reset code is live and returns the account it belongs to.
 *
 * Run before showing the form so an expired link says so immediately, rather
 * than after the user has chosen and typed a new password twice.
 */
export const verifyResetCode = async (oobCode) => {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { success: true, email };
  } catch (error) {
    return { success: false, code: error?.code, error: error?.message };
  }
};

export const completePasswordReset = async (oobCode, newPassword) => {
  // Note this returns auth/weak-password from our OWN pre-check, before Firebase
  // is called at all. That is worth knowing when reading a report: seeing "Pick
  // a stronger password" on screen says nothing about what the server thought,
  // and this project enforces no password policy beyond a 6-character minimum -
  // looser than the rules below - so the server has never been the source.
  if (!isPasswordAcceptable(newPassword)) {
    console.warn('[auth/action] rejected locally by validatePassword, not by Firebase');
    return {
      success: false,
      code: 'auth/weak-password',
      error: 'Password must be at least 8 characters with uppercase, lowercase, and a number.',
    };
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    return { success: true };
  } catch (error) {
    // The rendered sentence is a lookup on this code and is not evidence of
    // which failure occurred. Log the raw code so a recurrence is diagnosable
    // from the console rather than from the wording on screen.
    console.warn('[auth/action] confirmPasswordReset failed:', error?.code, error?.message);
    return { success: false, code: error?.code, error: error?.message };
  }
};

/**
 * Applies a verification or email-recovery code.
 *
 * checkActionCode runs first purely to learn the address involved, so the
 * result screen can name it. It consumes nothing - applyActionCode is what
 * spends the code.
 */
export const applyCode = async (oobCode) => {
  let email = null;

  try {
    const info = await checkActionCode(auth, oobCode);
    email = info?.data?.email || null;
  } catch {
    // Non-fatal: applyActionCode below reports the real problem.
  }

  try {
    await applyActionCode(auth, oobCode);

    // The signed-in session still carries the old emailVerified claim; without
    // this the app would keep insisting the address is unconfirmed.
    if (auth.currentUser) {
      await auth.currentUser.reload().catch(() => {});
    }

    return { success: true, email };
  } catch (error) {
    return { success: false, code: error?.code, error: error?.message };
  }
};
