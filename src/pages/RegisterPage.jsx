import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, initializationService } from '../services/firebase';
import AuthLayout from './AuthLayout';
import { TextField } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { describeAuthError, validatePassword } from './authErrors';

const RULES = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUpperCase', label: 'One uppercase letter' },
  { key: 'hasLowerCase', label: 'One lowercase letter' },
  { key: 'hasNumber', label: 'One number' },
];

export const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const checks = validatePassword(form.password);

  // Same rules the phone app's RegisterScreen applies, so an account that can
  // be created on one client can be created on the other.
  const validate = () => {
    const next = {};

    if (!form.name.trim()) next.name = 'Name is required';

    if (!form.email) {
      next.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      next.email = 'Email is invalid';
    }

    if (!form.password) {
      next.password = 'Password is required';
    } else if (!checks.minLength) {
      next.password = 'Password must be at least 8 characters';
    } else if (!checks.hasUpperCase || !checks.hasLowerCase || !checks.hasNumber) {
      next.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!form.confirmPassword) {
      next.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setWarning('');

    if (!validate()) return;

    setLoading(true);
    const normalizedEmail = form.email.trim().toLowerCase();
    const result = await authService.register(normalizedEmail, form.password, form.name.trim());

    if (!result.success) {
      setError(describeAuthError(result.code, result.error || 'Registration failed'));
      setLoading(false);
      return;
    }

    // Creates the profile, both outlet documents, power_safety settings and
    // this month's budget. useAuth would also repair this on sign-in, but doing
    // it here means a new account never renders an app with no outlets.
    const initResult = await initializationService.initializeNewUser(result.user.uid, {
      email: normalizedEmail,
      name: form.name.trim(),
    });

    if (!initResult.success) {
      console.error('Failed to initialize user data:', initResult.error);
      setWarning('Account created, but setup is incomplete. Sign out and back in to retry.');
    }

    // Signed in already — AuthGate redirects.
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="One account works across the web dashboard and the Android app."
      footer={
        <span>
          Already registered? <Link to="/login">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        {error ? <Banner tone="alert">{error}</Banner> : null}
        {warning ? <Banner tone="warn">{warning}</Banner> : null}

        <TextField
          label="Name"
          autoComplete="name"
          placeholder="Juan Dela Cruz"
          value={form.name}
          onChange={update('name')}
          error={fieldErrors.name}
        />

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
        />

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 4,
            fontSize: 12,
          }}
        >
          {RULES.map((rule) => (
            <li
              key={rule.key}
              style={{
                color: checks[rule.key] ? 'var(--ww-primary-dark)' : 'var(--ww-text-light)',
              }}
            >
              {checks[rule.key] ? '✓' : '○'} {rule.label}
            </li>
          ))}
        </ul>

        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />

        <Button type="submit" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
