import { useState } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { resolveApplianceLine } from './applianceLine';
import { resolveOutletBadge } from './outletBadge';
import { resolveSuggestionTrust, describeUncertainty } from './loadStability';
import styles from './OutletCard.module.css';

const METRICS = [
  { key: 'voltage', label: 'Voltage', unit: 'V', digits: 1 },
  { key: 'current', label: 'Current', unit: 'A', digits: 2 },
  { key: 'power', label: 'Power', unit: 'W', digits: 1 },
  { key: 'energy', label: 'Today', unit: 'kWh', digits: 3 },
];

// registerApplianceProfile trims names to this length.
const MAX_NAME_LENGTH = 40;

const format = (value, digits) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : (0).toFixed(digits);
};

/**
 * One outlet. Both render side by side above the fold — the whole point of a
 * desktop layout, versus the phone app's stacked single column.
 *
 * The switch is optimistic: `checked` follows the click immediately and the
 * onSnapshot that follows reconciles it. The callable has to reach
 * asia-southeast1 and a cold start alone can take seconds.
 */
export const OutletCard = ({
  outletNumber,
  isOn,
  applianceName,
  metrics,
  // Fresh telemetry AND real power over 0.5 W, from useOutletControl. Power
  // only since the phone's b90e529 — see `drawing` below.
  hasLoad,
  suggestion,
  // Raw applianceIdentity from the outlet document. Read here rather than
  // through useOutletControl, which is byte-identical to the phone's copy and
  // does not surface `namedAs`.
  identity,
  // 'on' | 'off' | null — a toggle the ESP32 has not picked up yet, resolved by
  // the shared buildLiveAppliances. See switchingFor in DashboardPage.
  switchingTo,
  // The backend has confirmed this outlet was told to open and did not. Not a
  // slower version of `switchingTo` — the opposite of it.
  relayStuck,
  telemetryFresh,
  disabled,
  onToggle,
  onRename,
}) => {
  const [busy, setBusy] = useState(false);
  const [typedName, setTypedName] = useState('');

  const fallbackLabel = `Outlet ${outletNumber}`;

  /*
   * 'changed' means the detector scored the live run against the signature saved
   * under this outlet's own name and it did not match — whatever is plugged in,
   * it is not that. The owner swapped a 16 W lamp for a 60 W fan and both
   * clients went on calling the outlet "LED Lamp" until he accepted a suggestion
   * a minute later.
   *
   * So the card stops asserting the name and states the doubt instead. It does
   * not guess a replacement: the detector's alternative is a suggestion, and
   * suggestion-first means the user confirms it. `unknown` is never treated as
   * `changed` — a typed name is a claim, not a measurement, and accusing someone
   * of swapping an appliance the system never measured is worse than silence.
   */
  /*
   * The outlet is the heading; the appliance is what changes underneath it, and
   * the line reports what is being *measured* rather than what the outlet is
   * called.
   *
   * Nothing is asserted until the detector has actually placed the load. The
   * card used to print the stored name the instant a draw appeared, so
   * switching on a new appliance flashed "Electric Fan" for several seconds
   * before admitting it was not one. That is the same claim-without-evidence as
   * the stale voltage on Power Safety — it just corrected itself fast enough to
   * look like a glitch instead of a bug.
   *
   * `applianceIdentity` is only about the name it was computed against, which is
   * why `namedAs` is checked. Accepting a suggestion renames the outlet
   * immediately, but the stored verdict still describes the *old* name until the
   * next evaluation — that is what briefly rendered "Not Speaker" one second
   * after choosing Speaker. A verdict about a name the outlet no longer wears is
   * not evidence about the one it does.
   */
  /*
   * A toggle in flight. `status` already reads the commanded value while the
   * relay is still in the old one, so for this window neither "On" nor "Off" is
   * a true statement — the transition is.
   */
  const switching = switchingTo === 'on' || switchingTo === 'off' ? switchingTo : null;

  /*
   * Whether the suggestion below is a finding or a guess.
   *
   * The detector always returns its best match, and the card always printed it
   * as though best meant good. An iPhone halfway through its charge taper came
   * back "Monitor · 50% confident" with Speaker at 45%, Electric Fan at 39% and
   * Laptop Charger at 37% — four profiles inside thirteen points, which is what
   * a signature resembling everything slightly and nothing much looks like.
   *
   * `stdDevPowerW` arrives on the suggestion since the phone's 17472f5. This
   * briefly read it from the raw document via a `featuresFor` helper in
   * DashboardPage, because useOutletControl is byte-identical to the phone's
   * copy and mapped meanPower but not this one. Asked for in §0ad, shipped, and
   * the workaround deleted — the seventh correction to round-trip.
   */
  const trust = resolveSuggestionTrust({
    confidencePercent: suggestion?.confidencePercent,
    candidates: suggestion?.candidates,
    suggestedName: suggestion?.name,
    ambiguous: suggestion?.ambiguous,
    meanPowerW: suggestion?.meanPowerW,
    stdDevPowerW: suggestion?.stdDevPowerW,
  });

  /*
   * The meter decides, not the commanded state — matching the phone's
   * `isDrawing = powerW > LIVE_LOAD_FLOOR_W`.
   *
   * This was `isOn && hasLoad`, and the `isOn` half was doing nothing `hasLoad`
   * did not: `hasLoad` is already fresh-telemetry-AND-live-load, so a genuinely
   * off outlet reads 0 W and fails it anyway. All the extra term achieved was
   * excluding an outlet commanded off whose relay had not opened yet — which
   * put "No appliance detected yet" directly above a live 52.6 W.
   */
  /*
   * Back on the shared `hasLoad` prop.
   *
   * This was re-derived locally from real power for one reason: hasLiveLoad also
   * accepted `current >= 0.01 A`, and this meter's residual on a switched-off
   * outlet is 0.02 A at 0.0 W — enough to pass with nothing consuming, which is
   * what put "Nokia's Fan · recognised" under an outlet that was off. The phone
   * dropped the current term in b90e529 and the file is re-synced, so the
   * divergence has nothing left to defend.
   */
  const drawing = hasLoad === true;

  // Every branch of this lives in applianceLine.js, tested — it is the line that
  // has been wrong more often than anything else on this page.
  const line = resolveApplianceLine({
    isDrawing: drawing,
    telemetryFresh,
    applianceName,
    identity,
    scope: suggestion,
  });
  const identityChanged = line.tone === 'changed';
  const unsupported = line.tone === 'unsupported';

  /*
   * A detection run ends when the outlet goes off, or when the draw stays under
   * 3 W for three samples. A sustained level shift does NOT end it — so swapping
   * appliances on a live outlet keeps one run alive across both and blends every
   * figure it produces. It is not just the mean that moves: the spread goes 0.5
   * to 17.3, and erratic draw is a Speaker's whole signature, which is how a
   * steady fan came back as "Speaker @ 84%".
   *
   * That makes this the one case where the suggestion beside it may be measured
   * from an appliance that is no longer plugged in, so the hint has to sit with
   * the suggestion rather than replace it.
   *
   * Gated on `drawing` because "switch this outlet off and on" is nonsense for an
   * outlet that is already off, and on `!unsupported` because that line outranks
   * "changed" and the two together would contradict.
   *
   * Wording is identical to the phone's ApplianceSuggestion.js. Workaround, not a
   * fix — see KNOWN LIMITATION in their applianceDetector.js and
   * FROM-THE-PHONE-REPO.md §34.3.
   */
  const showSwapHint = drawing && identityChanged && !unsupported;

  const applianceLine = line.text;

  // Tested in outletBadge.js. It reports the commanded state and the measured
  // state, which are known under different conditions — "On, idle" claimed both
  // at once and kept claiming the second one after readings stopped.
  const badge = resolveOutletBadge({
    isOn,
    isDrawing: drawing,
    telemetryFresh,
    switchingTo: switching,
    relayStuck,
  });

  /*
   * Naming, as on the phone since Oct 2026: ONE offer (the closest match) and a
   * field to type the real name. The ranked list of alternatives went - a 60 W
   * printer and a 60 W fan are indistinguishable by wattage, and the person
   * standing next to it is the one who knows. A load outside the catalogue
   * (askName) gets only the field: "Not in Dagitab's list - what is it?".
   *
   * Offered or typed, the name goes through registerApplianceProfile, which
   * names the outlet AND saves this appliance's power pattern, so the next run
   * of it names itself.
   */
  const submitName = async (name, options) => {
    setBusy(true);
    await onRename(name, options);
    setBusy(false);
  };

  // The closest match. When the detector is unsure, the leader is still the
  // best single guess - offered as "closest", not as a verdict.
  const closest = suggestion?.askName
    ? ''
    : suggestion?.name || suggestion?.candidates?.[0]?.name || '';

  const acceptSuggestion = () =>
    submitName(closest, {
      source: closest === suggestion?.name ? 'auto_suggestion' : 'user_choice',
      confidencePercent: closest === suggestion?.name ? suggestion?.confidencePercent : undefined,
      modelVersion: suggestion?.modelVersion,
    });

  const typed = typedName.replace(/\s+/g, ' ').trim();
  const saveTyped = async (event) => {
    event.preventDefault();
    if (!typed || busy) return;
    await submitName(typed.slice(0, MAX_NAME_LENGTH), {
      source: 'user_choice',
      modelVersion: suggestion?.modelVersion,
    });
    setTypedName('');
  };

  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <div className={styles.identity}>
          <span className={`${styles.dot} ${isOn ? styles.dotOn : ''}`} aria-hidden="true" />
          <div className={styles.names}>
            <h2 className={styles.name}>{fallbackLabel}</h2>
            <p
              className={`${styles.sub} ${
                unsupported
                  ? styles.subUnsupported
                  : identityChanged && drawing
                    ? styles.subChanged
                    : ''
              } ${drawing ? '' : styles.subIdle}`}
              /* The idle-with-a-name case used to live here too, and a tooltip
                 was the wrong place for it: `title` needs a hover, and this page
                 is served to tablets. On a touchscreen the card read "No
                 appliance detected yet" above "Rename it under Settings" with
                 nothing on screen reconciling the two. It is in the footer now,
                 where it can actually be read. */
              title={
                unsupported
                  ? 'The readings do not match any appliance Dagitab monitors. It covers low-voltage devices up to 500 W per outlet. Usage and cost are still recorded.'
                  : identityChanged && drawing
                    ? `Named ${applianceName}, but the readings do not match it`
                    : undefined
              }
            >
              {applianceLine}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <Badge tone={badge.tone}>{badge.text}</Badge>
          <Switch
            checked={isOn}
            disabled={disabled}
            onChange={onToggle}
            label={`Toggle ${fallbackLabel}${applianceName ? ` (${applianceName})` : ''}`}
          />
        </div>
      </div>

      <div className={styles.liveRow}>
        <p className={styles.liveValue}>
          <span className="ww-num">{format(metrics.power, 1)}</span>
          <span className={styles.liveUnit}>W</span>
        </p>
        <p className={styles.liveCaption}>drawing right now</p>
      </div>

      <dl className={styles.metrics}>
        {METRICS.map((metric) => (
          <div key={metric.key} className={styles.metric}>
            <dt className={styles.metricLabel}>{metric.label}</dt>
            <dd className={styles.metricValue}>
              <span className="ww-num">{format(metrics[metric.key], metric.digits)}</span>
              <span className={styles.metricUnit}>{metric.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* Sits above the suggestion rather than inside it, so it still shows on a
          swapped outlet the detector has not managed to name. */}
      {showSwapHint ? (
        <div className={styles.swapHint}>
          <p>
            Different appliance detected. Switch this outlet off and on to measure it on its
            own — otherwise this reading still includes the last one.
          </p>
        </div>
      ) : null}

      {/* The detector proposes, the user confirms - nothing here renames on its
          own. `askName` is the out-of-catalogue case: no offer, just the field. */}
      {suggestion?.showBadge && (!unsupported || suggestion.askName) ? (
        <div className={styles.suggestion}>
          {suggestion.askName ? (
            <div className={styles.suggestionHead}>
              <span>
                Not in Dagitab&apos;s list · <strong>what is it?</strong>
              </span>
            </div>
          ) : closest ? (
            <div className={styles.offerRow}>
              <span className={styles.suggestionHead}>
                <span>
                  {trust.trusted ? 'Looks like ' : 'Not sure · closest: '}
                  <strong>{closest}</strong>
                </span>
              </span>
              <Button size="sm" onClick={acceptSuggestion} loading={busy}>
                Use
              </Button>
            </div>
          ) : null}

          {suggestion.meanPowerW != null ? (
            <p className={styles.suggestionMeta}>
              {trust.trusted || suggestion.askName
                ? `Measured about ${suggestion.meanPowerW.toFixed(1)} W.`
                : describeUncertainty({
                  varying: trust.varying,
                  swingW: trust.swingW,
                  meanPowerW: suggestion.meanPowerW,
                })}
            </p>
          ) : null}

          <form className={styles.typeRow} onSubmit={saveTyped}>
            <input
              className={styles.typeInput}
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              placeholder={closest ? 'Or type the real name, e.g. Printer' : 'Type its name, e.g. Rice Cooker'}
              maxLength={MAX_NAME_LENGTH}
              disabled={busy}
              aria-label="Appliance name"
            />
            <Button size="sm" variant="secondary" type="submit" disabled={!typed || busy}>
              Save
            </Button>
          </form>
        </div>
      ) : (
        /* No suggestion to show. Nothing to offer either — naming happens by
           accepting a measurement, so an outlet with no detection yet simply
           waits for one rather than inviting a name the app cannot verify. */
        <div className={styles.footer}>
          <p className={styles.footerNote}>
            {/* Naming advice would be wrong here: there is no profile to offer
                and no signature worth learning. Say what is still true instead
                — metering is unaffected, only identification is. */}
            {unsupported
              ? 'Dagitab identifies low-voltage appliances up to 500 W. Usage and cost are still being recorded.'
              /* Idle, but the outlet carries a name. Offering "rename it" alone
                 directly under "No appliance detected yet" reads as a
                 contradiction — the reader is told there is no appliance and
                 then told to rename one. Both halves are true and neither is
                 the whole answer, so say which is which before the advice. */
              /* Freshness first. `drawing` is false when the meter reads zero
                 AND when no meter is reporting at all, and only one of those
                 justifies "Nothing is drawing" - which is a claim about a
                 measurement. During a power cut this sentence said it while
                 the badge two lines above correctly read "No recent
                 readings", so the same card asserted and disclaimed the same
                 fact. applianceLine.js already guards this; this string was
                 written separately and did not. */
              : telemetryFresh === false && applianceName
                ? `This outlet is named ${applianceName}. No readings are arriving, so nothing can be checked right now.`
              : !drawing && applianceName
                ? `Last named ${applianceName}. Switch it on and Dagitab checks what is plugged in.`
                : applianceName
                  ? 'Rename it under Settings → Saved appliances.'
                  : 'Switch it on and Dagitab suggests a name, or asks what it is.'}
          </p>
        </div>
      )}
    </Card>
  );
};

export default OutletCard;
