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
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
