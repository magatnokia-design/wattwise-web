import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/firebase';
import AuthLayout from './AuthLayout';
import { TextField } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { describeAuthError } from './authErrors';
import styles from './AuthLayout.module.css';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    setLoading(true);
    // resetPassword checks the account exists via the checkUserExistsByEmail
    // callable before sending, so an unknown address reports as such rather
    // than silently succeeding.
    const result = await authService.resetPassword(email);
    setLoading(false);

    if (!result.success) {
      setError(describeAuthError(result.code, result.error || 'Failed to send reset email'));
      return;
    }

    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We will email you a link to set a new one."
      footer={<Link to="/login">← Back to sign in</Link>}
    >
      {sent ? (
        <Banner tone="good" title="Email sent.">
          Check the inbox for {email.trim().toLowerCase()} and follow the link.
        </Banner>
      ) : (
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

          <Button type="submit" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
