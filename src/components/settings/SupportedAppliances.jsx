import { Card, CardHeader } from '../ui/Card';
import {
  DETECTABLE_APPLIANCES,
  UNSUPPORTED_APPLIANCES,
  OUTLET_LIMIT_W,
  COMBINED_LIMIT_W,
} from './applianceCatalogue';
import styles from './SupportedAppliances.module.css';

/*
 * A static reference, and it has to be static.
 *
 * The detector can say "not something Dagitab monitors" only for loads between
 * the catalogue's ceiling and the outlet's: anything over 500 W is cut by the
 * firmware after 3 seconds, which is 2 telemetry posts where a classification
 * needs 4. So for a kettle or an iron — the appliances a user is most likely to
 * wonder about — the app can never answer at run time. This card is the only
 * place those can be named.
 */
// Compact (Oct 2026), as on the phone: the list and the limits, no paragraphs.
export const SupportedAppliances = () => (
  <Card>
    <CardHeader title="What Dagitab can monitor" />

    <ul className={styles.grid}>
      {DETECTABLE_APPLIANCES.map((appliance) => (
        <li key={appliance.name} className={styles.item}>
          <span className={styles.itemName}>{appliance.name}</span>
          <span className={styles.itemWatts}>{appliance.typical}</span>
        </li>
      ))}
    </ul>

    <div className={styles.limits}>
      <div className={styles.limit}>
        <span className={styles.limitValue}>{OUTLET_LIMIT_W} W</span>
        <span className={styles.limitLabel}>per outlet</span>
      </div>
      <div className={styles.limit}>
        <span className={styles.limitValue}>{COMBINED_LIMIT_W} W</span>
        <span className={styles.limitLabel}>both outlets together</span>
      </div>
    </div>

    <div className={styles.deny}>
      <p className={styles.denyTitle}>Do not plug these in</p>
      <ul className={styles.denyList}>
        {UNSUPPORTED_APPLIANCES.map((name) => (
          <li key={name} className={styles.denyItem}>
            {name}
          </li>
        ))}
      </ul>
    </div>
  </Card>
);

export default SupportedAppliances;
