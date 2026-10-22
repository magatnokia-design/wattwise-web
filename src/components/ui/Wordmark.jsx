import {
  BRAND_VIEWBOX,
  BRAND_D_PATH,
  BRAND_BOLT_PATH,
  BRAND_WORD_PATH,
  BRAND_ASPECT,
} from '../../constants/brandMark';
import { BrandGradient, useGradientId } from './BrandMark';

/**
 * The Dagitab logo: the green D with its bolt, then "AGITAB" in navy. The D is
 * the first letter, so there is no separate tile beside it - the old BoltMark
 * tile + text pair is this one element now.
 *
 * Outlines, not text. The supplied logo set the word in Arial Bold Italic,
 * which would only look like the logo where that font is installed; drawn from
 * constants/brandMark.js it is the same shape in every browser.
 *
 * Sized by `height` (the D's height in px); width follows from the artwork.
 * `onColor` is the white version for a green ground.
 *
 * The phone app has its own copy at components/common/Wordmark.js. They cannot
 * be one file - RN and DOM primitives do not overlap - but both read the same
 * brandMark.js.
 */
export const Wordmark = ({ height = 24, onColor = false, className }) => {
  const gradientId = useGradientId();
  return (
    <svg
      className={className}
      viewBox={BRAND_VIEWBOX}
      height={height}
      width={Math.round(height * BRAND_ASPECT)}
      role="img"
      aria-label="Dagitab"
    >
      <BrandGradient id={gradientId} />
      <path d={BRAND_D_PATH} fill={onColor ? '#FFFFFF' : `url(#${gradientId})`} />
      <path d={BRAND_BOLT_PATH} fill={onColor ? 'var(--ww-primary)' : '#FFFFFF'} />
      <path d={BRAND_WORD_PATH} fill={onColor ? '#FFFFFF' : 'var(--ww-text)'} />
    </svg>
  );
};

export default Wordmark;
