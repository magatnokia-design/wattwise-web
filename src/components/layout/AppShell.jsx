import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Banner } from '../ui/Feedback';
import { BoltMark } from '../ui/BoltMark';
import { ErrorBoundary } from './ErrorBoundary';
import styles from './AppShell.module.css';

// Persistent left nav rather than the phone app's bottom tab bar. Grouped
// because a desktop sidebar can hold every destination at once — on the phone
// half of these live behind the Settings tab.
const NAV_GROUPS = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/analytics', label: 'Analytics', icon: '📊' },
      { to: '/history', label: 'History', icon: '📋' },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/schedule', label: 'Schedule', icon: '⏱️' },
      { to: '/safety', label: 'Power Safety', icon: '🛡️' },
    ],
  },
  {
    label: 'Cost',
    items: [
      { to: '/budget', label: 'Budget', icon: '💰' },
      { to: '/comparison', label: 'Compare Months', icon: '⚖️' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/notifications', label: 'Notifications', icon: '🔔', badge: 'unread' },
      { to: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

// The two pages that earn the wider content cap. See .mainWide for the
// reasoning — briefly, these are the only two where more width is more data
// rather than more gap.
const WIDE_PAGES = new Set(['/analytics', '/comparison']);

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/history': 'History',
  '/schedule': 'Schedule',
  '/safety': 'Power Safety',
  '/budget': 'Budget',
  '/comparison': 'Compare Months',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export const AppShell = () => {
  const { user } = useAuth();
  // Count only. The sidebar is mounted on every authenticated page, so it must
  // not drag the full notifications list listener along with it.
  const unreadCount = useUnreadCount(user?.uid);
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const displayName = user?.displayName || user?.email || 'Signed in';
  const initial = String(displayName).trim().charAt(0).toUpperCase() || '?';

  /**
   * Confirmed rather than immediate. Signing out is one click away from every
   * screen, and `authService.logout` unregisters this browser's push token
   * before it signs out — so an accidental click is not free to undo.
   *
   * No redirect on success: onAuthStateChanged fires, AuthGate sees no user and
   * routes to /login.
   */
  const handleSignOut = async () => {
    setSignOutError('');
    setSigningOut(true);

    const result = await authService.logout();

    if (!result.success) {
      setSigningOut(false);
      setSignOutError(result.error || 'Could not sign out. Check your connection and try again.');
      return;
    }
  };

  const closeSignOut = () => {
    if (signingOut) return;
    setConfirmSignOut(false);
    setSignOutError('');
  };

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>

      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <BoltMark height={17} />
          </span>
          <div>
            <p className={styles.brandName}>WattWise</p>
            <p className={styles.brandSub}>Energy monitor</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <p className={styles.navGroupLabel}>{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge === 'unread' && unreadCount > 0 ? (
                    <span className={styles.navBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <span className={styles.accountName} title={displayName}>
            {displayName}
          </span>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className={styles.body}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
          >
            ☰
          </button>
          <h1 className={styles.pageTitle}>{PAGE_TITLES[location.pathname] || 'WattWise'}</h1>
          <Button variant="secondary" size="sm" onClick={() => setConfirmSignOut(true)}>
            Sign out
          </Button>
        </header>

        {/* Inside the shell, not around it: a crashed page leaves the sidebar
            standing, which is what the user needs to get out of it. Keyed on the
            path so navigating elsewhere remounts the boundary and clears the
            error, instead of stranding them on the fallback. */}
        <main
          id="main"
          className={`${styles.main} ${
            WIDE_PAGES.has(location.pathname) ? styles.mainWide : ''
          }`}
        >
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <Modal
        open={confirmSignOut}
        onClose={closeSignOut}
        title="Sign out?"
        width={400}
        footer={
          <>
            <Button variant="secondary" onClick={closeSignOut} disabled={signingOut}>
              Stay signed in
            </Button>
            <Button variant="danger" onClick={handleSignOut} loading={signingOut}>
              Sign out
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {signOutError ? <Banner tone="alert">{signOutError}</Banner> : null}

          <p style={{ fontSize: 13.5, color: 'var(--ww-text)' }}>
            You are signed in as <strong>{displayName}</strong>.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ww-text-light)' }}>
            Your outlets keep running exactly as they are — schedules and safety cut-offs run on
            the server, not in this browser. You will need your password to sign back in.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AppShell;
