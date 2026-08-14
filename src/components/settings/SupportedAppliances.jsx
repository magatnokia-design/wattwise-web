import { Card, CardHeader } from '../ui/Card';
import {
  DETECTABLE_APPLIANCES,
  UNSUPPORTED_APPLIANCES,
  OUTLET_LIMIT_W,
  COMBINED_LIMIT_W,
  COMBINED_WARNING_W,
} from './applianceCatalogue';
import styles from './SupportedAppliances.module.css';

/*
 * A static reference, and it has to be static.
 *
 * The detector can say "not something WattWise monitors" only for loads between
 * the catalogue's ceiling and the outlet's: anything over 500 W is cut by the
 * firmware after 3 seconds, which is 2 telemetry posts where a classification
 * needs 4. So for a kettle or an iron — the appliances a user is most likely to
 * wonder about — the app can never answer at run time. This card is the only
 * place those can be named.
 */
export const SupportedAppliances = () => (
  <Card>
    <CardHeader
      title="What WattWise can monitor"
      subtitle="Low-voltage appliances, and the limits enforced on the device."
    />

    <p className={styles.lede}>
      WattWise recognises these on its own. It does not need to be told what is
      plugged in — it measures how the appliance draws power and matches that
      against the list.
    </p>

    <ul className={styles.grid}>
      {DETECTABLE_APPLIANCES.map((appliance) => (
        <li key={appliance.name} className={styles.item}>
          <span className={styles.itemName}>{appliance.name}</span>
          <span className={styles.itemWatts}>{appliance.typical}</span>
        </li>
      ))}
    </ul>

    <p className={styles.note}>
      The wattages are what the detector expects on average over a run, not a
      nameplate rating. Anything else in range still gets measured and billed —
      it is only the <em>name</em> WattWise cannot guess, and it will say so
      rather than pick the closest match.
    </p>

    <div className={styles.limits}>
      <div className={styles.limit}>
        <span className={styles.limitValue}>{OUTLET_LIMIT_W} W</span>
        <span className={styles.limitLabel}>per outlet</span>
      </div>
      <div className={styles.limit}>
        <span className={styles.limitValue}>{COMBINED_LIMIT_W} W</span>
        <span className={styles.limitLabel}>both outlets together</span>
      </div>
      <p className={styles.limitNote}>
        Enforced by the ESP32 itself, three seconds after the limit is passed. It
        does not wait on wi-fi or on this page, so an outlet can switch off with
        nothing here having asked for it.
      </p>
      <p className={styles.limitWarning}>
        There is one more threshold between those two. A combined draw over{' '}
        <strong>{COMBINED_WARNING_W} W</strong> raises a Power Safety warning even
        though neither outlet is over its own limit — 400 W on one and 400 W on
        the other is enough. Nothing switches off at that point; it is where the
        pair becomes worth watching.
      </p>
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
      <p className={styles.denyNote}>
        All of these draw well over {OUTLET_LIMIT_W} W, or pull a large surge as
        they start. They will be cut off, and repeatedly tripping the relay under
        load wears its contacts.
      </p>
    </div>

    <p className={styles.note}>
      <strong>Your own appliances go further than this list.</strong> Accept a
      suggestion once and WattWise saves that appliance&rsquo;s signature, then
      recognises it whenever it comes back — including ones the generic list has
      no name for. Those live under Learned appliances above.
    </p>
  </Card>
);

export default SupportedAppliances;
