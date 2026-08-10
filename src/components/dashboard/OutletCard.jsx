import { useState } from 'react';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Feedback';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/Field';
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
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState(false);

  const fallbackLabel = `Outlet ${outletNumber}`;
  const displayName = applianceName || fallbackLabel;

  const openRename = () => {
    setDraftName(applianceName || '');
    setRenameOpen(true);
  };

  const submitName = async (name, options) => {
    setBusy(true);
    await onRename(name, options);
    setBusy(false);
    setRenameOpen(false);
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
            <h2 className={styles.name} title={displayName}>
              {displayName}
            </h2>
            <p className={styles.sub}>
              {fallbackLabel}
              {applianceName ? ' · named' : ' · not named yet'}
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
            <Button size="sm" variant="secondary" onClick={openRename}>
              Name it myself
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
        <div className={styles.footer}>
          <Button size="sm" variant="ghost" onClick={openRename}>
            {applianceName ? 'Rename appliance' : 'Name this appliance'}
          </Button>
        </div>
      )}

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={`Name ${fallbackLabel}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={() => submitName(draftName.trim() || fallbackLabel, { source: 'manual' })}
            >
              Save
            </Button>
          </>
        }
      >
        <TextField
          label="Appliance name"
          placeholder="Electric fan"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          hint="If this appliance is running now, WattWise also learns its power signature so it can recognise it next time."
          autoFocus
        />
      </Modal>
    </Card>
  );
};

export default OutletCard;
