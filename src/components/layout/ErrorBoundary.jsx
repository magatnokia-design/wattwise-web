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
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as console.error rather than swallowed: this is the only record that
    // a crash happened, and the stack is what makes it reproducible.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

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
          This page stopped working
        </h2>
        <p style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ww-text-light)' }}>
          Something broke while drawing this page. Nothing was lost — your outlets, readings and
          history are unaffected, and the rest of WattWise still works.
        </p>
        <p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ww-text-light)' }}>
          Pick another page from the sidebar to carry on, or reload to try this one again.
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
          Reload the page
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
