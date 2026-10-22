import { useId } from 'react';
import {
  BRAND_MARK_VIEWBOX,
  BRAND_D_PATH,
  BRAND_BOLT_PATH,
  BRAND_GRADIENT,
} from '../../constants/brandMark';

/**
 * The Dagitab D on its own - the mark without the name. Replaced BoltMark on
 * 22 Oct 2026; the geometry is the logo's, from constants/brandMark.js (a
 * copy-rule file generated in the phone repo), so the tab, the inbox and the
 * app show one mark.
 *
 * `onColor` is for a green ground: white D, green bolt. Decorative wherever it
 * appears, so it is hidden from assistive tech; <Wordmark> carries the name.
 */
export const BrandMark = ({ size = 24, onColor = false }) => {
  const gradientId = useGradientId();
  return (
    <svg
      viewBox={BRAND_MARK_VIEWBOX}
      width={size}
      height={size}
      focusable="false"
      aria-hidden="true"
    >
      <BrandGradient id={gradientId} />
      <path d={BRAND_D_PATH} fill={onColor ? '#FFFFFF' : `url(#${gradientId})`} />
      <path d={BRAND_BOLT_PATH} fill={onColor ? 'var(--ww-primary)' : '#FFFFFF'} />
    </svg>
  );
};

/**
 * A gradient id unique to this instance. SVG ids are document-global, and the
 * mark appears several times per page - in the sidebar, which is display:none
 * on a phone. A fill that points at a gradient inside a display:none <svg>
 * renders as nothing in Chrome, so a shared id would blank every other copy.
 * useId's output contains characters url(#...) does not accept unescaped.
 */
export const useGradientId = () => `dagitab-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

export const BrandGradient = ({ id }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={BRAND_GRADIENT.from} />
      <stop offset="1" stopColor={BRAND_GRADIENT.to} />
    </linearGradient>
  </defs>
);

export default BrandMark;
