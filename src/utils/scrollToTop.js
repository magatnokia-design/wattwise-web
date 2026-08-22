/**
 * Send the window back to the top of the document.
 *
 * Smooth by default, instant for anyone who has asked their system for reduced
 * motion. The landing page is long enough that a jump-cut back to the header is
 * disorienting, which is the whole reason the control exists — but a smooth
 * scroll is exactly the kind of movement `prefers-reduced-motion` is meant to
 * suppress, so it is honoured rather than overridden.
 */
export const scrollToTop = () => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
};

export default scrollToTop;
