/**
 * The WattWise bolt, as the brand actually defines it.
 *
 * This used to be a ⚡ emoji, which renders orange or yellow in every font that
 * ships one — a colour the theme does not contain. The mark is the path below
 * in the theme green, and it is the same geometry as the favicon in
 * `index.html` and `public/email-logo.png`, so the tab, the inbox and the app
 * show one mark rather than three that drifted.
 *
 * Source: `docs/FROM-THE-PHONE-REPO.md` §25. Bounds are 26x44 and must not be
 * "tidied" to a round number — the ratio is what makes it legible at 16px.
 *
 * Fill is `currentColor` so the enclosing tile sets it. Decorative wherever it
 * appears beside the wordmark, so callers mark the tile `aria-hidden`.
 */
export const BoltMark = ({ height = 18 }) => (
  <svg
    viewBox="0 0 26 44"
    height={height}
    width={(26 / 44) * height}
    fill="currentColor"
    focusable="false"
    aria-hidden="true"
  >
    <path d="M17 0 L0 25 L10 25 L8 44 L26 18 L15 18 Z" />
  </svg>
);

export default BoltMark;
