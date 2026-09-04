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
   * Naming is suggestion-only, by the owner's decision.
   *
   * There is no free-text field on either client any more: a name arrives by
   * accepting what the detector measured, or by picking one of its alternatives.
   * Relabelling afterwards is Settings → saved appliances → Rename, which goes
   * through renameApplianceProfile and carries the outlet with it.
   *
   * Both paths below still reach registerApplianceProfile, which is what learns
   * the signature — so accepting a suggestion teaches WattWise exactly as typing
   * a name used to.
   */
  const submitName = async (name, options) => {
    setBusy(true);
    await onRename(name, options);
    setBusy(false);
  };

  const acceptSuggestion = () =>
    submitName(suggestion.name, {
      source: 'auto_suggestion',
      confidencePercent: suggestion.confidencePercent,
      modelVersion: suggestion.modelVersion,
    });

  const chooseCandidate = (candidate) =>
    submitName(candidate.name, {
      source: 'user_choice',
      modelVersion: suggestion.modelVersion,
    });

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
                  ? 'The readings do not match any appliance WattWise monitors. It covers low-voltage devices up to 500 W per outlet. Usage and cost are still recorded.'
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
          <span className={styles.swapHintIcon} aria-hidden="true">🔄</span>
          <p>
            Different appliance detected. Switch this outlet off and on to measure it on its
            own — otherwise this reading still includes the last one.
          </p>
        </div>
      ) : null}

      {/* Suggestion-first: the detector proposes, the user confirms. Nothing
          here renames anything on its own. */}
      {/* `&& !unsupported` is belt-and-braces: the backend sets appliance to
          null for an out-of-scope run, so suggestionPending should already be
          false. Offering "This looks like X" directly under "Not something
          WattWise monitors" would contradict itself, so guard it here too. */}
      {suggestion?.showBadge && !unsupported ? (
        <div className={styles.suggestion}>
          {trust.trusted ? (
            <>
              <div className={styles.suggestionHead}>
                <span aria-hidden="true">💡</span>
                <span>
                  This looks like <strong>{suggestion.name}</strong>
                  {suggestion.confidencePercent != null
                    ? ` (${suggestion.confidencePercent}% confident)`
                    : ''}
                </span>
              </div>

              {suggestion.meanPowerW != null ? (
                <p className={styles.suggestionMeta}>
                  Measured about {suggestion.meanPowerW.toFixed(1)} W
                  {suggestion.runtimeSeconds
                    ? ` over ${Math.round(suggestion.runtimeSeconds / 60)} min`
                    : ''}
                  .
                </p>
              ) : null}

              <div className={styles.suggestionActions}>
                <Button size="sm" onClick={acceptSuggestion} loading={busy}>
                  Use this name
                </Button>
              </div>
            </>
          ) : (
            /*
             * The detector answered, but not well enough for the answer to be
             * presented as one. Naming a single leader here is what made an
             * iPhone mid-charge read "Monitor · 50% confident" — a verdict the
             * evidence did not support, over a load that was still being
             * measured perfectly.
             *
             * No primary button in this branch. Offering "Use this name" under
             * "WattWise is not sure" contradicts itself, and the 50% leader has
             * no more claim than the 45% behind it.
             */
            <>
              <div className={styles.suggestionHead}>
                <span aria-hidden="true">🤔</span>
                <span>WattWise is not sure what this is</span>
              </div>

              <p className={styles.suggestionMeta}>
                {describeUncertainty({
                  varying: trust.varying,
                  swingW: trust.swingW,
                  meanPowerW: suggestion.meanPowerW,
                })}
              </p>
            </>
          )}

          {suggestion.candidates?.length > 1 ? (
            <div className={styles.candidates}>
              <span className={styles.candidatesLabel}>
                {trust.trusted ? 'Or:' : 'Closest matches:'}
              </span>
              {suggestion.candidates
                /*
                 * The leader is filtered out only when it has already been
                 * offered above. Where nothing was offered it belongs in the
                 * list like everything else — it is a candidate, not a verdict.
                 */
                .filter((candidate) => !trust.trusted || candidate.name !== suggestion.name)
                .map((candidate) => (
                  <button
                    key={candidate.name}
                    type="button"
                    className={styles.candidate}
                    onClick={() => chooseCandidate(candidate)}
                    disabled={busy}
                  >
                    {candidate.name}
                    {candidate.confidencePercent != null
                      ? ` · ${candidate.confidencePercent}%`
                      : ''}
                  </button>
                ))}
            </div>
          ) : null}

          {/*
            The instruction that was missing at the moment it is needed.

            The owner plugged in a ceiling fan, was offered LED Lamp, scanned the
            list for "Ceiling Fan", did not find it, and asked whether picking
            LED Lamp was allowed. It was — he did the right thing on instinct —
            but nothing on screen said so, and hesitating there is the difference
            between naming an appliance and abandoning the flow.
          */}
          <p className={styles.suggestionHint}>
            Not one of these? Pick the closest anyway, then rename it under
            Settings. WattWise saves how <em>this</em> appliance draws power, not
            the name it started from.
          </p>
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
              ? 'WattWise identifies low-voltage appliances up to 500 W. Usage and cost are still being recorded.'
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
                ? `This outlet is named ${applianceName}. No readings are arriving, so nothing can be detected right now. Rename it under Settings → Learned appliances.`
              : !drawing && applianceName
                ? `This outlet is named ${applianceName}. Nothing is drawing, so there is nothing to detect right now. Rename it under Settings → Learned appliances.`
                : applianceName
                  ? 'Rename it under Settings → Learned appliances.'
                  : 'Run the appliance for a minute and WattWise will suggest a name.'}
          </p>
        </div>
      )}
    </Card>
  );
};

export default OutletCard;
