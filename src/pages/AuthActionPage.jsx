import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { TextField } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Banner, Spinner } from '../components/ui/Feedback';
import { describeAuthError } from './authErrors';
import {
  verifyResetCode,
  completePasswordReset,
  applyCode,
  validatePassword,
} from '../services/firebase/authActions';
import styles from './AuthLayout.module.css';

/**
 * Handles the one-time links in Firebase's emails, on our own domain.
 *
 * Firebase hosts an equivalent page at wattwise-fe394.firebaseapp.com, which is
 * where these links point until "Customise action URL" is set in the console.
 * That page is unbranded and says "project-421489842338" in places - taking the
 * traffic here means the whole journey stays on wattwise.site.
 *
 * Deliberately mounted outside AuthGate. A signed-in user clicking a
 * verification link must be able to finish it, and AuthGate's signed-in branch
 * would bounce them to the dashboard before the code was ever spent.
 */
const RESET_HINT = 'At least 8 characters, with uppercase, lowercase, and a number.';

const RequirementList = ({ password }) => {
  const checks = validatePassword(password);
  const items = [
    ['At least 8 characters', checks.minLength],
    ['An uppercase letter', checks.hasUpperCase],
    ['A lowercase letter', checks.hasLowerCase],
    ['A number', checks.hasNumber],
  ];

  return (
    <ul style={{ margin: '2px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 3 }}>
      {items.map(([label, met]) => (
        <li
          key={label}
          style={{
            fontSize: 12,
            color: met ? 'var(--ww-primary-dark)' : 'var(--ww-text-light)',
          }}
        >
          {met ? '✓' : '○'} {label}
        </li>
      ))}
    </ul>
  );
};

export const AuthActionPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  // 'checking' | 'reset' | 'done' | 'error'
  const [phase, setPhase] = useState('checking');
  const [accountEmail, setAccountEmail] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!oobCode || !mode) {
        if (!cancelled) {
          setError('This link is incomplete. Open it directly from the email, without editing it.');
          setPhase('error');
        }
        return;
      }

      if (mode === 'resetPassword') {
        const result = await verifyResetCode(oobCode);
        if (cancelled) return;

        if (!result.success) {
          setError(describeAuthError(result.code, result.error));
          setPhase('error');
          return;
        }

        setAccountEmail(result.email || '');
        setPhase('reset');
        return;
      }

      if (mode === 'verifyEmail' || mode === 'recoverEmail') {
        const result = await applyCode(oobCode);
        if (cancelled) return;

        if (!result.success) {
          setError(describeAuthError(result.code, result.error));
          setPhase('error');
          return;
        }

        setAccountEmail(result.email || '');
        setPhase('done');
        return;
      }

      setError(`This link asks for an action WattWise does not handle (${mode}).`);
      setPhase('error');
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  /*
   * Clears the banner the moment either field is edited.
   *
   * Without this the banner only cleared on the next submit, while the tick
   * list re-rendered on every keystroke — so a rejected password left
   * "Pick a stronger password." on screen as the user fixed it, until all four
   * ticks were green underneath a message saying it was not good enough. Same
   * for "The two passwords do not match." once the second field was corrected.
   *
   * Not the server's doing: this project sets no custom password policy
   * (minPasswordLength 6, nothing else), and `completePasswordReset` returns
   * `auth/weak-password` from its own pre-check before Firebase is ever called.
   * The rules the ticks describe are stricter than the ones being enforced, so
   * a green tick list genuinely cannot be rejected for strength.
   */
  const editPassword = (setter) => (event) => {
    setter(event.target.value);
    setError('');
  };

  const handleReset = useCallback(async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setSaving(true);
    const result = await completePasswordReset(oobCode, password);
    setSaving(false);

    if (!result.success) {
      setError(describeAuthError(result.code, result.error));
      // An expired code cannot be retried, so send them back to the start
      // rather than leaving a form that can never succeed.
      if (result.code === 'auth/expired-action-code' || result.code === 'auth/invalid-action-code') {
        setPhase('error');
      }
      return;
    }

    setPhase('done');
  }, [oobCode, password, confirmPassword]);

  if (phase === 'checking') {
    return (
      <AuthLayout title="Just a moment" subtitle="Checking your link…">
        <Spinner label="Checking your link" />
      </AuthLayout>
    );
  }

  if (phase === 'error') {
    return (
      <AuthLayout
        title="This link didn't work"
        subtitle="Links from WattWise emails are single-use and short-lived."
        footer={
          <Link to="/login" className={styles.footerLink}>
            ← Back to sign in
          </Link>
        }
      >
        <div className={styles.formStack}>
          <Banner tone="alert">{error}</Banner>
          <Button onClick={() => navigate('/forgot-password')}>
            Request a new link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (phase === 'done') {
    const isReset = mode === 'resetPassword';

    return (
      <AuthLayout
        title={isReset ? 'Password updated' : 'Email confirmed'}
        subtitle={
          isReset
            ? 'You can sign in with your new password now.'
            : 'Your address is verified. WattWise can reach you.'
        }
        footer={
          <Link to="/login" className={styles.footerLink}>
            Go to sign in
          </Link>
        }
      >
        <div className={styles.formStack}>
          <Banner tone="good" title={isReset ? 'All set.' : 'Confirmed.'}>
            {accountEmail
              ? `This applies to ${accountEmail}.`
              : 'Your account has been updated.'}
          </Banner>
          {!isReset ? (
            <p style={{ fontSize: 13, color: 'var(--ww-text-light)', lineHeight: 1.55, margin: 0 }}>
              If the phone app is still asking you to confirm, pull it forward and tap
              “I&apos;ve verified — continue”.
            </p>
          ) : null}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={accountEmail ? `For ${accountEmail}` : 'For your WattWise account'}
      footer={
        <Link to="/login" className={styles.footerLink}>
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleReset} className={styles.formStack}>
        {error ? <Banner tone="alert">{error}</Banner> : null}

        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={editPassword(setPassword)}
          hint={password ? undefined : RESET_HINT}
        />

        {password ? <RequirementList password={password} /> : null}

        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={editPassword(setConfirmPassword)}
        />

        <Button type="submit" loading={saving}>
          Save new password
        </Button>
      </form>
    </AuthLayout>
  );
};

export default AuthActionPage;
