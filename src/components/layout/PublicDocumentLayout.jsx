import { Link, Outlet } from 'react-router-dom';
import { Wordmark } from '../ui/Wordmark';
import styles from './PublicDocumentLayout.module.css';

/**
 * About, Privacy and Terms for someone who is not signed in.
 *
 * These used to sit only inside the signed-in shell, so a signed-out visitor -
 * including Google's OAuth branding check - was redirected to /login and never
 * saw the policy. A privacy policy has to be readable before you have an
 * account; that is the point of it. Signed in, the same routes still render
 * inside AppShell.
 *
 * The document itself comes through <Outlet />: it is the same DocumentPage the
 * shell renders, so there is one source of the text. AppShell normally supplies
 * the page title, so this layout supplies it here.
 */

export const PUBLIC_DOCUMENT_TITLES = {
  '/about': 'About Dagitab',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms & Conditions',
};

export const PublicDocumentLayout = ({ pathname }) => (
  <div className={styles.page}>
    <header className={styles.header}>
      <Link to="/" aria-label="Dagitab home">
        <Wordmark height={28} />
      </Link>
      <Link to="/login" className={styles.signIn}>Sign in</Link>
    </header>

    <main className={styles.main}>
      <h1 className={styles.title}>{PUBLIC_DOCUMENT_TITLES[pathname]}</h1>
      <Outlet />
    </main>

    <footer className={styles.footer}>
      <Link to="/about">About</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/terms">Terms</Link>
      <a href="mailto:support@dagitab.site">support@dagitab.site</a>
    </footer>
  </div>
);

export default PublicDocumentLayout;
