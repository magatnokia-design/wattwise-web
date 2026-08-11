import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/firebase';
import AuthLayout from './AuthLayout';
import { TextField } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { describeAuthError } from './authErrors';
import DownloadApp from '../components/auth/DownloadApp';
import styles from './AuthLayout.module.css';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * Clears the banner on edit, not on submit — that is the whole bug.
   *
   * "That email and password do not match an account." used to sit there while
   * the user retyped, so the form contradicted its own contents: a corrected
   * password under a message saying it was wrong. Same shape the phone repo
   * just fixed in LoginScreen, and the same one AuthActionPage had.
   *
   * Guarded so an untouched banner is not re-set on every keystroke, matching
   * the phone's clearFieldError idiom.
   */
  const editField = (setter) => (event) => {
    setter(event.target.value);
    setError((current) => (current ? '' : current));
  };

  // No navigate() on success: onAuthStateChanged fires, AuthGate sees a user
  // and redirects to whichever route was originally requested.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    const result = await authService.login(email.trim(), password);
    if (!result.success) {
      setError(describeAuthError(result.code, result.error));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the same account as the WattWise app on your phone."
      footer={
        <>
          <Link to="/forgot-password" className={styles.footerLink}>
            Forgot password?
          </Link>
          <DownloadApp />
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.formStack}>
        {error ? <Banner tone="alert">{error}</Banner> : null}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={editField(setEmail)}
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={editField(setPassword)}
        />

        <Button type="submit" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
