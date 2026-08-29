import { Component } from 'react';

/**
 * Catches render errors so one bad page does not take the whole app with it.
 *
 * Without this, any exception thrown while rendering unmounts the entire React
 * tree and leaves a blank white page — no sidebar, no navigation, no message,
 * and nothing to do but reload and hope. The phone repo hit the same thing on
 * release builds and added a boundary around its navigator; this is the web
 * equivalent.
 *
 * Deliberately built from plain elements and CSS variables rather than Card,
 * Button or Banner. The thing that just crashed may well have been a UI
 * component, and a fallback that re-throws is worse than no fallback.
 *
 * Reset is by remount: callers pass `key={location.pathname}`, so navigating
 * anywhere else rebuilds the boundary and clears the error. That is why the
 * sidebar has to stay outside it — it is the way out.
 */
/**
 * Whether the page failed to *arrive* rather than failed to render.
 *
 * Analytics is the one route loaded with `lazy(() => import(...))`, so its
 * chunk is fetched the first time someone opens it. With no connection that
 * fetch fails and the rejected import surfaces here as a render error — which
 * is how a page that was working perfectly reported "Something broke while
 * drawing this page" on a phone with no signal. Nothing broke; the file never
 * downloaded.
 *
 * Vite raises this as "Failed to fetch dynamically imported module" and also
 * dispatches `vite:preloadError`; browsers word the underlying failure
 * differently, so several spellings are matched.
 */
const isChunkLoadError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('dynamically imported module')
    || message.includes('failed to fetch dynamically')
    || message.includes('importing a module script failed')
    || message.includes('error loading dynamically imported module')
    || error?.name === 'ChunkLoadError'
  );
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // A missing chunk is not a crash and does not need a stack - logging it as
    // one buries real errors in noise from every offline navigation.
    if (isChunkLoadError(error)) {
      console.warn('[ErrorBoundary] page chunk could not be downloaded', error?.message);
      return;
    }

    // Kept as console.error rather than swallowed: this is the only record that
    // a crash happened, and the stack is what makes it reproducible.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const offlineChunk = isChunkLoadError(error);

    return (
      <div
        role="alert"
        style={{
          maxWidth: 560,
          margin: '48px auto',
          padding: 24,
          borderRadius: 14,
          border: '1px solid var(--ww-border)',
          background: 'var(--ww-white)',
          color: 'var(--ww-text-dark)',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {offlineChunk ? "Can't open this page without a connection" : 'This page stopped working'}
        </h2>
        <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ww-text-light)' }}>
          {offlineChunk
            ? 'This page is downloaded the first time you open it, and the download could not reach the server. Nothing is broken and nothing has been lost.'
            : 'Something broke while drawing this page. Nothing was lost — your outlets, readings and history are unaffected, and the rest of WattWise still works.'}
        </p>
        <p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ww-text-light)' }}>
          {offlineChunk
            ? 'Check your network, then try again. The pages already open still work.'
            : 'Pick another page from the sidebar to carry on, or reload to try this one again.'}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 18,
            padding: '9px 16px',
            borderRadius: 9,
            border: 'none',
            background: 'var(--ww-primary)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {offlineChunk ? 'Try again' : 'Reload the page'}
        </button>

        {/* The message is for whoever is debugging, not the user — hence collapsed. */}
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 12.5, color: 'var(--ww-text-light)', cursor: 'pointer' }}>
            Technical details
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: 10,
              overflowX: 'auto',
              fontSize: 12,
              lineHeight: 1.5,
              borderRadius: 8,
              background: 'var(--ww-bg)',
              color: 'var(--ww-text-light)',
            }}
          >
            {String(error?.message || error)}
          </pre>
        </details>
      </div>
    );
  }
}

export default ErrorBoundary;
