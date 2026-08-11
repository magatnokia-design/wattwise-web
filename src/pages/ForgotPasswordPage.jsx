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
  // The address the link actually went to, captured at send time rather than
  // read back off the live field.
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    setLoading(true);
    // resetPassword checks the account exists via the checkUserExistsByEmail
    // callable before sending, so an unknown address reports as such rather
    // than silently succeeding.
    const normalizedEmail = email.trim().toLowerCase();
    const result = await authService.resetPassword(normalizedEmail);
    setLoading(false);

    if (!result.success) {
      setError(describeAuthError(result.code, result.error || 'Failed to send reset email'));
      return;
    }

    setSentTo(normalizedEmail);
  };

  const startOver = () => {
    setSentTo('');
    setError('');
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We will email you a link to set a new one."
      footer={<Link to="/login">← Back to sign in</Link>}
    >
      {sentTo ? (
        /*
         * Three facts the plain "check your inbox" message left out. Each one
         * produces the same dead end — the handler reporting the link as
         * expired or already used, with no clue which. Kept in line with the
         * phone app's ForgotPasswordScreen, which states the same three on send.
         *
         * The sender is named rather than just saying "check spam": since Auth
         * mail moved onto Brevo with wattwise.site authenticated by DKIM+DMARC
         * it lands in the inbox, so an exact address to search for beats
         * sending everyone to their spam folder first.
         */
        <div className={styles.formStack}>
          <Banner tone="good" title="Reset link sent.">
            Sent to {sentTo}.
          </Banner>

          <ul className={styles.factList}>
            <li>
              The link <strong>expires in 1 hour</strong>.
            </li>
            <li>
              It comes from <strong>WattWise &lt;support@wattwise.site&gt;</strong>. Search for that
              address if it has not arrived, and check your spam folder.
            </li>
            <li>
              If you request another, <strong>only the newest link works</strong> — every earlier
              one stops working the moment a new one is sent. Do not go back to an older email.
            </li>
          </ul>

          <Button variant="secondary" onClick={startOver}>
            Use a different email
          </Button>
        </div>
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
