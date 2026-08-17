import { useMemo, useState } from 'react';
import styles from './SafetyDemo.module.css';

/**
 * The four-stage safety ladder, made draggable.
 *
 * Thresholds and stage names come from functions/src/lib/powerSafety.js:
 * WARNING_RATIO 0.8, LIMIT_RATIO 0.95, cutoff at or above the configured limit,
 * against a 500 W per-outlet ceiling the ESP32 enforces in firmware regardless
 * of what the app is told.
 *
 * These constants now exist in three places — the backend, safetyHelpers.js
 * (a copy-rule file that keeps them module-private, so they cannot be imported
 * from there), and here. That file already carries a "keep in step with" note
 * for the same reason; this is the third entry in that arrangement. If the
 * ratios move, all three move together.
 *
 * The cutoff copy says "if auto-protection is on" because that is the actual
 * condition in handleSafetyAlerts — the stage is computed regardless, but the
 * relay is only opened when the user has enabled it. Claiming an unconditional
 * cutoff would be the kind of safety promise this project is careful not to make.
 */
const OUTLET_LIMIT_W = 500;
const WARNING_RATIO = 0.8;
const LIMIT_RATIO = 0.95;

const STAGES = {
  normal: {
    name: 'Normal',
    tone: 'normal',
    detail: 'Readings are recorded. Nothing interrupts you.',
  },
  warning: {
    name: 'Warning',
    tone: 'warning',
    detail: 'At 80% of the limit you get a notification. The outlet keeps running.',
  },
  limit: {
    name: 'At limit',
    tone: 'limit',
    detail: 'At 95% a second, higher-priority alert goes out. Still running.',
  },
  cutoff: {
    name: 'Cut off',
    tone: 'cutoff',
    detail:
      'At the limit WattWise opens the relay — if auto-protection is on — and tells you which outlet and why.',
  },
};

const ORDER = ['normal', 'warning', 'limit', 'cutoff'];

const stageFor = (ratio) => {
  if (ratio >= 1) return 'cutoff';
  if (ratio >= LIMIT_RATIO) return 'limit';
  if (ratio >= WARNING_RATIO) return 'warning';
  return 'normal';
};

export const SafetyDemo = () => {
  const [watts, setWatts] = useState(210);

  const { stage, ratio } = useMemo(() => {
    const value = watts / OUTLET_LIMIT_W;
    return { stage: stageFor(value), ratio: value };
  }, [watts]);

  const active = STAGES[stage];
  const percent = Math.round(ratio * 100);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <label className={styles.label} htmlFor="ww-safety">
          Drag to change the load on one outlet
        </label>
        <output className={styles.reading} htmlFor="ww-safety">
          {watts} W
          <span className={styles.percent}>{percent}% of limit</span>
        </output>
      </div>

      {/* The zone bar is the legend — the four bands are drawn to scale, so the
          fact that "warning" starts four-fifths of the way along is visible
          rather than something the reader has to take on trust. */}
      <div className={styles.track} aria-hidden="true">
        <span className={`${styles.zone} ${styles.zoneNormal}`} style={{ flex: WARNING_RATIO }} />
        <span
          className={`${styles.zone} ${styles.zoneWarning}`}
          style={{ flex: LIMIT_RATIO - WARNING_RATIO }}
        />
        <span className={`${styles.zone} ${styles.zoneLimit}`} style={{ flex: 1 - LIMIT_RATIO }} />
      </div>

      <input
        id="ww-safety"
        type="range"
        min="0"
        max={OUTLET_LIMIT_W}
        step="5"
        value={watts}
        onChange={(event) => setWatts(Number(event.target.value))}
        className={styles.slider}
      />

      <div className={styles.scale}>
        <span>0 W</span>
        <span>{Math.round(OUTLET_LIMIT_W * WARNING_RATIO)} W</span>
        <span>{Math.round(OUTLET_LIMIT_W * LIMIT_RATIO)} W</span>
        <span>{OUTLET_LIMIT_W} W</span>
      </div>

      <div className={`${styles.state} ${styles[`state_${active.tone}`]}`} aria-live="polite">
        <div className={styles.stateHead}>
          <span className={styles.stateDot} aria-hidden="true" />
          <strong className={styles.stateName}>{active.name}</strong>
        </div>
        <p className={styles.stateDetail}>{active.detail}</p>
      </div>

      <ol className={styles.ladder}>
        {ORDER.map((key) => (
          <li
            key={key}
            className={`${styles.rung} ${stage === key ? styles.rungOn : ''} ${
              styles[`rung_${STAGES[key].tone}`]
            }`}
          >
            {STAGES[key].name}
          </li>
        ))}
      </ol>

      <p className={styles.note}>
        The 500 W per-outlet ceiling and the 1000 W total are enforced in the ESP32&rsquo;s own
        firmware as well as in the cloud, so a phone that is switched off or out of signal
        cannot raise them.
      </p>
    </div>
  );
};

export default SafetyDemo;
