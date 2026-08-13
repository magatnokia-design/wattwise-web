import { useState } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
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
  suggestion,
  hasLoad,
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
  const identityChanged = suggestion?.identityState === 'changed' && !!applianceName;
  const displayName = identityChanged ? `Not ${applianceName}` : applianceName || fallbackLabel;

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
            <h2
              className={`${styles.name} ${identityChanged ? styles.nameChanged : ''}`}
              title={identityChanged ? `Named ${applianceName}, but the readings do not match it` : displayName}
            >
              {displayName}
            </h2>
            <p className={styles.sub}>
              {fallbackLabel}
              {identityChanged
                ? ' · readings do not match this name'
                : applianceName
                  ? suggestion?.recognised
                    ? ' · recognised'
                    : ' · named'
                  : ' · not named yet'}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <Badge tone={isOn ? (hasLoad ? 'good' : 'warn') : 'neutral'}>
            {isOn ? (hasLoad ? 'Drawing power' : 'On, idle') : 'Off'}
          </Badge>
          <Switch
            checked={isOn}
            disabled={disabled}
            onChange={onToggle}
            label={`Toggle ${displayName}`}
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

      {/* Suggestion-first: the detector proposes, the user confirms. Nothing
          here renames anything on its own. */}
      {suggestion?.showBadge ? (
        <div className={styles.suggestion}>
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

          {suggestion.candidates?.length > 1 ? (
            <div className={styles.candidates}>
              <span className={styles.candidatesLabel}>Or:</span>
              {suggestion.candidates
                .filter((candidate) => candidate.name !== suggestion.name)
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
        </div>
      ) : (
        /* No suggestion to show. Nothing to offer either — naming happens by
           accepting a measurement, so an outlet with no detection yet simply
           waits for one rather than inviting a name the app cannot verify. */
        <div className={styles.footer}>
          <p className={styles.footerNote}>
            {applianceName
              ? 'Rename this appliance in Settings → Saved appliances.'
              : 'Run the appliance for a minute and WattWise will suggest a name.'}
          </p>
        </div>
      )}
    </Card>
  );
};

export default OutletCard;
