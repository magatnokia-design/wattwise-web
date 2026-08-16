import styles from './Wordmark.module.css';

/**
 * The WattWise wordmark: "Watt" in the text colour, "Wise" in the theme green.
 *
 * Deliberately styles nothing but the colour of the second half. Size, weight
 * and the colour of "Watt" all come from whatever the call site already sets,
 * so this can drop into a 15px sidebar label and a 24px header without either
 * one fighting it in the cascade — and without this file needing to know how
 * many places use it.
 *
 * Pairs with [BoltMark]; the two together are the lockup on the setup booklet
 * cover and the favicon.
 */
export const Wordmark = ({ className }) => (
  <span className={className}>
    Watt<span className={styles.wise}>Wise</span>
  </span>
);

export default Wordmark;
